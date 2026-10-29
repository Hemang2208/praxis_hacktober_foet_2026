import { Suspense } from "react";
import NotificationPreferencesComponent from "@/components/profile/NotificationPreferences";
import { getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfilePageSkeleton } from "@/components/ui/profile-skeleton";

export default async function NotificationPreferencesPage() {
  try {
    const user = await getUserProfile();

    if (!user) {
      redirect("/auth/login");
    }

    return (
      <Suspense fallback={<ProfilePageSkeleton />}>
        <NotificationPreferencesComponent initialUser={user as unknown as Record<string, unknown>} />
      </Suspense>
    );
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">
          Error loading profile. Please try again.
        </div>
      </div>
    );
  }
}
