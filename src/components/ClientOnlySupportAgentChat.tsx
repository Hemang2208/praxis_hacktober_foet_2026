"use client";

import dynamic from "next/dynamic";
import { useUser } from "@/hooks/useUser";
import ChatErrorBoundary from "@/components/ui/ChatErrorBoundary";

// Dynamically import the SupportAgentChat with no SSR to prevent hydration issues
const SupportAgentChatComponent = dynamic(
  () =>
    import("./support-agent/SupportAgentChat").then(
      (mod) => mod.SupportAgentChat,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

/**
 * ClientOnlySupportAgentChat — renders the support agent chat inline
 * as the central panel of the Developer OS layout.
 * Only renders when user is authenticated.
 */
interface ClientOnlySupportAgentChatProps {
  chatId?: string;
  isOverview?: boolean;
}

export default function ClientOnlySupportAgentChat({
  chatId,
  isOverview = false,
}: ClientOnlySupportAgentChatProps = {}) {
  const { mongoUser } = useUser();

  // Only show Support Agent Chat if user is logged in
  if (!mongoUser) {
    return null;
  }

  return (
    <ChatErrorBoundary fallback={null}>
      <SupportAgentChatComponent chatId={chatId} isOverview={isOverview} />
    </ChatErrorBoundary>
  );
}
