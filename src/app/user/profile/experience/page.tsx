import { Suspense } from "react";
import ExperienceClient from "./ExperienceClient";
import { getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExperienceTabSkeleton } from "@/components/ui/profile-skeleton";

// Server Component - handles data fetching
export default async function ExperiencePage() {
  try {
    // Fetch user data on the server
    const user = await getUserProfile();

    if (!user) {
      redirect("/auth/login");
    }

    // Pass serialized user data to client component
    return (
      <Suspense fallback={<ExperienceTabSkeleton />}>
        <ExperienceClient initialUser={user} />
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
