"use client";

import { useEffect, useState } from "react";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";

export interface AssignedUser {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  image_url?: string;
  profile_picture?: string;
}

export function useAssignedUser(task_id?: string | null) {
  const [user, setUser] = useState<AssignedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task_id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(
            task_id,
          )}/assigned-user`,
          {
            cache: "no-store",
          },
        );

        if (res.status === 404) {
          // No assigned user found for this task; treat as empty result.
          if (mounted) {
            setUser(null);
            setError(null);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`status:${res.status}`);
        }

        const body = await res.json();

        // Try to normalize response shape. Agent or server may return either { user: {...} } or direct user object
        const raw = body?.user ?? body ?? null;

        // Map common field names to our AssignedUser shape
        const normalize = (obj: unknown) => {
          if (!obj || typeof obj !== "object") return null;
          const map = obj as Record<string, unknown>;
          const pickString = (keys: string[]) => {
            for (const k of keys) {
              const v = map[k];
              if (typeof v === "string" && v.length > 0) return v;
            }
            return undefined;
          };

          const id = pickString(["id", "_id", "user_id", "user", "user_id"]);
          const name = pickString([
            "name",
            "full_name",
            "full_name",
            "displayName",
            "username",
            "email",
          ]);
          const email = pickString(["email", "emailAddress", "email_address"]);
          
          // Extract each field separately first
          const avatarField = pickString(["avatar", "avatar_url"]);
          const imageUrlField = pickString(["image_url", "image_url"]);
          const profilePictureField = pickString(["profile_picture", "profile_picture", "photo", "picture"]);
          
          // Apply priority: avatar || image_url || profile_picture for the main avatar field
          const avatar = avatarField || imageUrlField || profilePictureField;

          return {
            id: id ?? undefined,
            name: name ?? undefined,
            email: email ?? undefined,
            avatar: avatar ?? undefined,
            image_url: imageUrlField ?? undefined,
            profile_picture: profilePictureField ?? undefined,
          };
        };

        const normalized = normalize(raw);

        if (mounted) setUser(normalized);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (mounted) {
          setError(message || "Failed to fetch assigned user");
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [task_id]);

  return { user, loading, error } as {
    user: AssignedUser | null;
    loading: boolean;
    error: string | null;
  };
}
