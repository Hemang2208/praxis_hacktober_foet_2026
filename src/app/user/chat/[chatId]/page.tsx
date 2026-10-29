import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientOnlySupportAgentChat from "@/components/ClientOnlySupportAgentChat";

type Params = Promise<{ chatId: string }>;

export default async function UserChatDetailPage({
  params,
}: {
  params: Params;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const chatId = resolvedParams.chatId;

  return <ClientOnlySupportAgentChat chatId={chatId} />;
}
