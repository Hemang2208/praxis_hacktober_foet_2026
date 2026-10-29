import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { mark_all_notifications_as_read } from "@/lib/notificationEvents";

async function get_authenticated_user() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aipm_token")?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyJwt(token);
  if (!payload || !payload.id) {
    return null;
  }

  return User.findById(payload.id);
}

function serialize_notification(notification: Record<string, any>) {
  const normalized_event_type = notification.event_type || notification.type || "SYSTEM_ACTIVITY";
  const normalized_metadata = notification.metadata || notification.data || {};
  const normalized_is_read = Boolean(
    typeof notification.is_read === "boolean"
      ? notification.is_read
      : notification.isRead,
  );
  const normalized_read_at = notification.read_at || notification.readAt || null;

  return {
    _id: String(notification._id),
    id: String(notification._id),
    user_id: String(notification.user_id),
    event_type: normalized_event_type,
    type: normalized_event_type,
    title: notification.title,
    message: notification.message,
    metadata: normalized_metadata,
    data: normalized_metadata,
    is_read: normalized_is_read,
    isRead: normalized_is_read,
    read_at: normalized_read_at,
    readAt: normalized_read_at,
    priority: notification.priority,
    category: notification.category,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
  };
}

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const user = await get_authenticated_user();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const category = searchParams.get("category");
    const is_read = searchParams.get("is_read");

    // Build query using MongoDB user ObjectId
    const query: Record<string, unknown> = { user_id: user._id };
    if (category) query.category = category;
    if (is_read !== null) {
      const read_value = is_read === "true";
      query.$or = [{ is_read: read_value }, { isRead: read_value }];
    }

    // Execute query with pagination
    const notifications_raw = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const notifications = notifications_raw.map((notification) =>
      serialize_notification(notification as Record<string, any>),
    );

    const total = await Notification.countDocuments(query);
    const unread_count = await Notification.countDocuments({
      user_id: user._id,
      $or: [{ is_read: false }, { isRead: false }],
    });

    return NextResponse.json({
      notifications,
      unread_count,
      unreadCount: unread_count,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Error fetching notifications:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// PATCH /api/notifications - Mark notifications as read (bulk operation)
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();

    const user = await get_authenticated_user();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      notification_ids,
      notificationIds,
      mark_all_as_read,
      markAllAsRead,
    } = body;

    let result;

    if (mark_all_as_read || markAllAsRead) {
      // Mark all unread notifications as read
      result = await mark_all_notifications_as_read(String(user._id));
    } else if (
      (notification_ids && Array.isArray(notification_ids)) ||
      (notificationIds && Array.isArray(notificationIds))
    ) {
      const ids = notification_ids || notificationIds;
      // Mark specific notifications as read
        result = await Notification.updateMany(
          {
            _id: { $in: ids },
            user_id: user._id,
            $or: [{ is_read: false }, { isRead: false }],
          },
          {
            $set: {
              is_read: true,
              isRead: true,
              read_at: new Date(),
              readAt: new Date(),
            },
          },
        );
    } else {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Error updating notifications:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const user = await get_authenticated_user();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationIds = searchParams.get("ids")?.split(",");
    const deleteAll = searchParams.get("deleteAll") === "true";

    let result;

    if (deleteAll) {
      // Delete all read notifications
      result = await Notification.deleteMany({
        user_id: user._id,
        $or: [{ is_read: true }, { isRead: true }],
      });
    } else if (notificationIds && notificationIds.length > 0) {
      // Delete specific notifications
      result = await Notification.deleteMany({
        _id: { $in: notificationIds },
        user_id: user._id,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(
      "Error deleting notifications:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 },
    );
  }
}
