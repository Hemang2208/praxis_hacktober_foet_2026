/**
 * Format a support agent task payload
 * @param title - Task title
 * @param notes - Task notes/description
 * @param priority - Task priority (default: 'medium')
 * @returns Formatted task object
 */
export function formatSupportAgentTask(
  title: string,
  notes?: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
): AssistantTaskPayload {
  return {
    title,
    description: notes,
    priority,
  };
}

/**
 * Create a support agent task for a user
 * @param user_id - The user ID to assign the task to
 * @param taskData - The formatted task data
 * @param userToken - Optional auth token
 * @returns API response or null if failed
 */
export async function createSupportAgentTask(
  user_id: string,
  taskData: AssistantTaskPayload,
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;
    const response = await fetch(`${baseUrl}/users/${user_id}/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
      body: JSON.stringify(taskData),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[SupportAgent] Failed to create task (${response.status}):`, errorText);
      return null;
    }
    const result: AssistantResponse = await response.json();
    return result;
  } catch (error) {
    console.warn('[SupportAgent] Error creating support agent task:', error);
    return null;
  }
}
/**
 * Comprehensive Assistant Service
 * Integrates with the comprehensive AI Assistant API for intelligent task and progress management
 * 
 * Features:
 * 1. Natural language queries about user data
 * 2. AI-powered recommendations and insights
 * 3. Progress analysis and tracking
 * 4. Complete user context access (tasks, projects, pull requests, feedback, etc.)
 * 5. Next best action suggestions
 */

import { SUPPORT_AGENT_URL } from "@/utils/API_URL";


interface AssistantTaskPayload {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  estimated_hours?: number;
  due_date?: string;
  tags?: string[];
}

interface AssistantResponse {
  id?: string;
  user_id?: string;
  title?: string;
  status?: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}


/**
 * Query the comprehensive assistant with a natural language question
 * 
 * @param query - The user's question in natural language
 * @param userToken - The user's authentication token (JWT)
 * @returns The assistant's response or null if failed
 */
export async function askAssistant(
  query: string,
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;

    console.log("[Assistant] Processing query:", query.slice(0, 100));

    const response = await fetch(`${baseUrl}/ask-me/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
      body: JSON.stringify({
        query: query.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[Assistant] Query failed (${response.status}):`, errorText);
      return null;
    }

    const result: AssistantResponse = await response.json();
    console.log("[Assistant] Query processed successfully");
    return result;
  } catch (error) {
    console.warn("[Assistant] Error processing query (non-blocking):", error);
    return null;
  }
}

/**
 * Get AI-powered recommendations for the user
 * 
 * @param userToken - The user's authentication token (JWT)
 * @returns Recommendations or null if failed
 */
export async function getRecommendations(
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;

    console.log("[Assistant] Fetching recommendations");

    const response = await fetch(`${baseUrl}/recommendations/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[Assistant] Failed to fetch recommendations (${response.status}):`, errorText);
      return null;
    }

    const result: AssistantResponse = await response.json();
    console.log("[Assistant] Recommendations fetched successfully");
    return result;
  } catch (error) {
    console.warn("[Assistant] Error fetching recommendations (non-blocking):", error);
    return null;
  }
}

/**
 * Get next best action suggestion for the user
 * 
 * @param userToken - The user's authentication token (JWT)
 * @returns Next action suggestion or null if failed
 */
export async function getNextAction(
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;

    console.log("[Assistant] Fetching next best action");

    const response = await fetch(`${baseUrl}/next-action/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[Assistant] Failed to fetch next action (${response.status}):`, errorText);
      return null;
    }

    const result: AssistantResponse = await response.json();
    console.log("[Assistant] Next action fetched successfully");
    return result;
  } catch (error) {
    console.warn("[Assistant] Error fetching next action (non-blocking):", error);
    return null;
  }
}

/**
 * Get user's progress analysis
 * 
 * @param userToken - The user's authentication token (JWT)
 * @returns Progress data or null if failed
 */
export async function getProgressAnalysis(
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;

    console.log("[Assistant] Fetching progress analysis");

    const response = await fetch(`${baseUrl}/analyze-my-progress/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[Assistant] Failed to fetch progress (${response.status}):`, errorText);
      return null;
    }

    const result: AssistantResponse = await response.json();
    console.log("[Assistant] Progress analysis fetched successfully");
    return result;
  } catch (error) {
    console.warn("[Assistant] Error fetching progress analysis (non-blocking):", error);
    return null;
  }
}

/**
 * Get user's complete profile and context
 * 
 * @param userToken - The user's authentication token (JWT)
 * @returns Complete profile or null if failed
 */
export async function getCompleteProfile(
  userToken?: string
): Promise<AssistantResponse | null> {
  try {
    const baseUrl = SUPPORT_AGENT_URL;

    console.log("[Assistant] Fetching complete profile");

    const response = await fetch(`${baseUrl}/my-complete-profile/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`[Assistant] Failed to fetch profile (${response.status}):`, errorText);
      return null;
    }

    const result: AssistantResponse = await response.json();
    console.log("[Assistant] Complete profile fetched successfully");
    return result;
  } catch (error) {
    console.warn("[Assistant] Error fetching complete profile (non-blocking):", error);
    return null;
  }
}
