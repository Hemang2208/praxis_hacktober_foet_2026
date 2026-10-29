import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User, IUser, IStudent } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { serverQueueAwareFetch } from "@/lib/queueAwareFetch";

const normalizeNoteTimestamps = (note: any) => {
  const parseDate = (value: unknown): string | undefined => {
    if (value == null) return undefined;
    if (typeof value === "object" && value !== null) {
      const rec = value as Record<string, unknown>;
      if ("$date" in rec) return parseDate(rec["$date"]);
    }

    let raw = String(value).trim();
    if (!raw) return undefined;

    // Treat bare ISO date-time strings without timezone as UTC.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw)) {
      raw += "Z";
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  return {
    ...note,
    created_at:
      parseDate(note.created_at ?? note.createdAt) ?? new Date().toISOString(),
    updated_at: parseDate(note.updated_at ?? note.updatedAt),
  };
};

// GET - Retrieve all non-deleted notes for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const url = `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}/notes`;
    const res = await fetch(url, { method: "GET" });
    const txt = await res.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Failed to fetch notes" },
        { status: res.status },
      );
    }

    // Return in legacy shape expected by current Redux thunks/UI
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    const activeNotes = notes
      .filter((n: any) => !n?.is_deleted)
      .map((n: any) => {
        const normalized = normalizeNoteTimestamps(n);
        return {
          id: String(normalized.id || normalized._id || ""),
          content: String(normalized.content || ""),
          created_at: normalized.created_at,
          updated_at: normalized.updated_at,
          parent_id: normalized.parent_id ?? null,
          is_deleted: Boolean(
            normalized.is_deleted ||
            normalized.isDeleted ||
            normalized.deleted ||
            false,
          ),
          author: {
            ...(normalized.author || {
              id: "unknown",
              name: "Unknown",
              avatar: "",
            }),
            role:
              normalized.author?.role ||
              normalized.author?.subrole ||
              undefined,
          },
        };
      })
      .filter((n: any) => Boolean(n.id));

    return NextResponse.json({
      success: true,
      notes: activeNotes,
      count: activeNotes.length,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

async function getNoteById(taskId: string, noteId: string) {
  try {
    const url = `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(taskId)}/notes`;
    const res = await fetch(url, { method: "GET" });
    const txt = await res.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;
    if (!res.ok) return null;

    const notes = Array.isArray(data?.notes) ? data.notes : [];
    return notes.find(
      (n: any) => String(n.id || n._id || "") === String(noteId),
    );
  } catch (error) {
    console.error("Error fetching note details:", error);
    return null;
  }
}

// POST - Add a note to a task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Find MongoDB user
    const user = await User.findById(payload.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { id } = await params;
    const { content, parent_id } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 },
      );
    }

    const role = (user as IUser).role;
    const authorRole =
      role === "company"
        ? "OWNER"
        : role === "college"
          ? "ADMIN"
          : role === "student"
            ? "TRAINEE"
            : String(role).toUpperCase();

    const author = {
      id: user._id.toString(),
      name:
        (role === "student" ? (user as IStudent).full_name : user.email) ||
        user.email,
      avatar:
        (user.role === "student" ? (user as IStudent).profile_picture : null) ||
        user.image_url ||
        "",
      role: authorRole,
    };

    const res = await serverQueueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parent_id: parent_id ?? null,
          author,
        }),
      },
    );

    const txt = await res.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Failed to add note" },
        { status: res.status },
      );
    }

    const note = normalizeNoteTimestamps(data?.note ?? data);
    return NextResponse.json({
      success: data?.success ?? true,
      note,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}

// PATCH - Update a note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Find MongoDB user
    const user = await User.findById(payload.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { id } = await params;
    const { noteId, content, is_deleted, isDeletedNote } = await request.json();
    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    const note = await getNoteById(id, noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const noteOwnerId =
      note.author?.id || note.author?.user_id || note.author?.email;
    const currentUserId = String(user._id);
    const currentUserEmail = String(user.email || "").toLowerCase();
    const isOwner =
      noteOwnerId === currentUserId ||
      String(note.author?.email || "").toLowerCase() === currentUserEmail;

    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if ((!content || !content.trim()) && typeof is_deleted === "undefined") {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 },
      );
    }

    const requestBody: Record<string, unknown> = {
      noteId,
    };
    if (content) {
      requestBody.content = content.trim();
      const updatedAt = new Date().toISOString();
      requestBody.updated_at = updatedAt;
      requestBody.updatedAt = updatedAt;
      requestBody.is_edited = true;
      requestBody.isEdited = true;
    }
    if (typeof is_deleted !== "undefined") {
      requestBody.is_deleted = Boolean(is_deleted);
    }
    if (typeof isDeletedNote !== "undefined") {
      requestBody.isDeletedNote = Boolean(isDeletedNote);
    }

    const res = await serverQueueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}/notes`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );

    const txt = await res.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Failed to update note" },
        { status: res.status },
      );
    }

    const normalizedNote = normalizeNoteTimestamps(data?.note ?? data);
    return NextResponse.json({
      success: data?.success ?? true,
      note: normalizedNote,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    // JWT authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Find MongoDB user
    const user = await User.findById(payload.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");
    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    const note = await getNoteById(id, noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const noteOwnerId =
      note.author?.id || note.author?.user_id || note.author?.email;
    const currentUserId = String(user._id);
    const currentUserEmail = String(user.email || "").toLowerCase();
    const isOwner =
      noteOwnerId === currentUserId ||
      String(note.author?.email || "").toLowerCase() === currentUserEmail;

    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const res = await serverQueueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}/notes?noteId=${encodeURIComponent(noteId)}`,
      {
        method: "DELETE",
      },
    );

    const txt = await res.text().catch(() => "");
    const data = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Failed to delete note" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
