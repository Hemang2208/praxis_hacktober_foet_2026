"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";

function InviteAcceptPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    async function acceptInvite() {
      if (!token) {
        setStatus("error");
        setMessage("Invalid invite link.");
        return;
      }

      let user_id = null;
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        user_id = data.user?._id;
      } catch {
        // ignore
      }

      if (!user_id) {
        setStatus("error");
        setMessage("You must be logged in to accept the invite.");
        return;
      }

      try {
        const res = await fetch("/api/company/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken: token, user_id }),
        });
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setCompanyId(data.companyId);
          setCompanyName(data.companyName);
          setMessage(`You have joined ${data.companyName || "the company"}.`);

          setTimeout(() => {
            if (data.companyId) {
              router.push(`/company/${data.companyId}`);
            }
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to accept invite.");
        }
      } catch {
        setStatus("error");
        setMessage("Failed to accept invite.");
      }
    }

    acceptInvite();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      {status === "pending" && (
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin w-8 h-8 mb-4" />
          <span>Accepting invite...</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <Alert variant="default">
            <AlertTitle>Invite Accepted</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          {companyId && (
            <Button asChild>
              <Link href={`/company/${companyId}`}>
                View {companyName || "Company"} Page
              </Link>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Redirecting automatically...</p>
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense>
      <InviteAcceptPageInner />
    </Suspense>
  );
}
