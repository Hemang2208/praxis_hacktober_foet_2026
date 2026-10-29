"use client";

import ClientOnlySupportAgentChat from "@/components/ClientOnlySupportAgentChat";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCollegeOverview, useCompanyOverview } from "@/redux/hooks";

export default function DashboardPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [role, setRole] = useState<"college" | "company" | null>(null);
  const [valid, setValid] = useState(false);
  const router = useRouter();

  const collegeOverview = useCollegeOverview(role === "college");
  const companyOverview = useCompanyOverview(role === "company");
  const overview = role === "company" ? companyOverview : collegeOverview;
  const loadingOverview = overview.loading;
  const overviewError = overview.error;

  useEffect(() => {
    async function checkJwt() {
      console.log("[Dashboard] Running checkJwt useEffect"); // Debug log
      try {
        const res = await fetch("/api/auth/check", { credentials: "include" });
        console.log("[Dashboard] /api/auth/check response status:", res.status); // Debug log
        if (res.ok) {
          const data = await res.json();
          console.log("[Dashboard] /api/auth/check data:", data); // Debug log
          if (data.role === "college" || data.role === "company") {
            setRole(data.role);
            setValid(true);
          } else {
            router.replace("/login");
          }
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("[Dashboard] Error in checkJwt:", err); // Debug log
        router.replace("/login");
      } finally {
        setLoadingAuth(false);
      }
    }
    checkJwt();
  }, [router]);

  if (loadingAuth || loadingOverview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!valid) return null;

  if (overviewError) {
    const message =
      overviewError === "Forbidden"
        ? "You do not have permission to view this dashboard. Please login with the correct account."
        : `Error loading dashboard: ${overviewError}`;

    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {message}
      </div>
    );
  }

  return <ClientOnlySupportAgentChat isOverview={true} />;
}
