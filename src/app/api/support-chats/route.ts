import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SupportAgentChat, { ISupportAgentChat } from "@/models/SupportAgentChat";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
// `Types` import removed because it's unused
import { User } from "@/models/User";
import { emit_notification_event } from "@/lib/notificationEvents";

// GET /api/support-chats - list user's chat sessions
export async function GET() {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const jwtPayload = await verifyJwt(token);
    if (!jwtPayload || !jwtPayload.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // find Mongo user by internal id
    const user = await User.findById(jwtPayload.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    // find user chats by internal user_id
    const query = { user_id: user._id, is_deleted: { $ne: true } };
    const chats = await SupportAgentChat.find(query).sort({ lastActivity: -1 }).limit(100);

    const chatPayload = chats.map((c) => ({
      id: c._id,
      title: c.title,
      messages: c.getRecentMessages(100),
      lastActivity: c.lastActivity,
    }));

    return NextResponse.json({ success: true, chats: chatPayload }, { status: 200 });
  } catch (error) {
    console.error("Error fetching support chats", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/support-chats - create a new chat record or append messages
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // find Mongo user by internal id
    const user = await User.findById(payload.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("support-chats: failed to parse JSON body", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = (body as { question?: string; response?: string; title?: string; chatId?: string; type?: string; data?: unknown }) || {};
    const { question, response, title, chatId, type, data } = parsed;

    if (!question || !response) {
      console.warn("support-chats: missing fields", { questionPresent: !!question, responsePresent: !!response, body });
      return NextResponse.json({ error: "Both question and response are required", received: { questionPresent: !!question, responsePresent: !!response } }, { status: 400 });
    }

    // If a chatId was provided, try to append messages to an existing document
    if (chatId) {
      try {
        const doc = await SupportAgentChat.findById(chatId);
        if (doc) {
          // Ensure the requesting user owns this chat to append messages
          if (String(doc.user_id) !== String(user._id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
          // If chat was previously soft-deleted, restore it when appending a new message
          if (doc.is_deleted) {
            doc.is_deleted = false;
            doc.deleted_at = undefined;
          }
          await doc.addMessage("user", question);
          await doc.addMessage("assistant", response, type, data);
          return NextResponse.json({ success: true, chatId: doc._id }, { status: 200 });
        }
      } catch (err) {
        console.warn("support-chats: failed to append to chatId", chatId, err);
        // fall through to create new doc
      }
    }

    // Create a new chat document that stores the pair as two messages
    const messages = [
      { role: "user", content: question, timestamp: new Date() },
      { role: "assistant", content: response, timestamp: new Date(), type: type || undefined, data: typeof data !== "undefined" ? data : undefined },
    ];

    const createPayload: { title: string; messages: unknown[]; lastActivity: Date; user_id?: unknown; externaluser_id?: string } = {
      title: title || (question.slice(0, 80) || "Support Chat"),
      messages,
      lastActivity: new Date(),
    };

    createPayload.user_id = user._id;

    const doc = await SupportAgentChat.create(createPayload as Partial<ISupportAgentChat>);

    const escalationKeywords = ["escalate", "speak to a human", "agent", "supervisor", "urgent", "complaint", "issue not resolved"];
    const lowerQuestion = (parsed.question || "").toLowerCase();
    const needsEscalation = escalationKeywords.some((kw) => lowerQuestion.includes(kw));

    if (needsEscalation) {
      try {
        await emit_notification_event({
          user_id: String(user._id),
          event_type: "SUPPORT_ESCALATION",
          title: "Support Escalation Requested",
          message: `Your support request has been flagged for review: ${(parsed.question || "").slice(0, 100)}`,
          category: "support",
          priority: "high",
          event_key: `SUPPORT_ESCALATION:${doc._id}`,
          metadata: {
            reason: "User requested escalation",
          },
        });
      } catch (notifError) {
        console.error("Failed to create escalation notification:", notifError);
      }
    }

    return NextResponse.json({ success: true, chatId: doc._id }, { status: 201 });
  } catch (error) {
    console.error("Error saving support chat", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/support-chats - delete a chat by id (expects JSON body { chatId })
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // find Mongo user by internal id
    const user = await User.findById(payload.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("support-chats DELETE: failed to parse JSON body", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = (body as { chatId?: string }) || {};
    const { chatId } = parsedBody;
    if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });

    // Find the document and verify ownership
    const doc = await SupportAgentChat.findById(chatId);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ensure the requesting user owns this chat
    const owns = String(doc.user_id) === String(user._id);
    if (!owns) {
      console.warn(`support-chats DELETE: user ${user._id} attempted to delete chat ${chatId} without ownership`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft-delete: mark as deleted rather than removing document
    doc.is_deleted = true;
    doc.deleted_at = new Date();
    await doc.save();
    return NextResponse.json({ success: true, chatId }, { status: 200 });
  } catch (error) {
    console.error("Error deleting support chat", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/support-chats - update chat metadata (e.g., title)
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // find Mongo user by internal id
    const user = await User.findById(payload.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("support-chats PATCH: failed to parse JSON body", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = (body as { chatId?: string; title?: string }) || {};
    const { chatId, title } = parsed;
    if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    if (typeof title === "undefined") return NextResponse.json({ error: "title is required" }, { status: 400 });

    const doc = await SupportAgentChat.findById(chatId);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ensure requesting user owns this chat
    const owns = String(doc.user_id) === String(user._id);
    if (!owns) {
      console.warn(`support-chats PATCH: user ${user._id} attempted to update chat ${chatId} without ownership`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    doc.title = String(title).slice(0, 200);
    await doc.save();
    return NextResponse.json({ success: true, chatId, title: doc.title }, { status: 200 });
  } catch (error) {
    console.error("Error updating support chat", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
