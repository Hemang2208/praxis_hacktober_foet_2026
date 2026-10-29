const Backend_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kiyoai.in/agent';

const normalizedBackendUrl = Backend_URL.replace(/\/$/, "");
const agentBaseUrl = normalizedBackendUrl.endsWith("/agent")
  ? normalizedBackendUrl
  : `${normalizedBackendUrl}/agent`;

export const ASSESSMENT_AGENT_URL: string = `${agentBaseUrl}/assessment-agent/api/v1`;
export const PLANNER_AGENT_URL: string = `${agentBaseUrl}/planner-agent/api/v1`;
export const TASK_MGMT_AGENT_URL: string = `${agentBaseUrl}/task-mgmt-agent/api/v1`;
export const CODE_REVIEW_AGENT_URL: string = `${agentBaseUrl}/code-review-agent/api/v1`;
export const SUPPORT_AGENT_URL: string = `${agentBaseUrl}/support-agent/api/v1`;

export { Backend_URL };
