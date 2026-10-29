export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { serve } from "inngest/next";
import { inngest } from "../../../../inngest/client";
import {
  onProjectMemberAdded,
  onProjectMemberRemoved,
  sendTestEmail,
  onSendNotificationEmail,
  onTaskDueSoon,
} from "../../../../inngest/functions";

const functions = [
  sendTestEmail,
  onProjectMemberAdded,
  onProjectMemberRemoved,
  onSendNotificationEmail,
  onTaskDueSoon,
];

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  servePath: "/api/inngest",
});
