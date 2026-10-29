"use client";

import ClientOnlySupportAgentChat from "@/components/ClientOnlySupportAgentChat";
import { IStudent } from "@/models/User";
import { useUserOverview } from "@/redux/hooks";

interface UserPageClientProps {
  user: IStudent;
}

export default function UserPageClient({ user }: UserPageClientProps) {
  const { loading, error } = useUserOverview();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#09090B]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error loading dashboard: {error}
      </div>
    );
  }

  return <ClientOnlySupportAgentChat isOverview={true} />;
}
