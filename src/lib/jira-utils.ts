export const JIRA_KEY_PATTERN = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

export function extractJiraKeys(text: string): string[] {
  const keys: string[] = [];
  let match;
  JIRA_KEY_PATTERN.lastIndex = 0;
  while ((match = JIRA_KEY_PATTERN.exec(text)) !== null) {
    keys.push(match[1]);
  }
  return [...new Set(keys)];
}

export function extractJiraKeysFromCommits(
  commits: Array<{ message: string }>
): string[] {
  const allKeys: string[] = [];
  for (const commit of commits) {
    allKeys.push(...extractJiraKeys(commit.message));
  }
  return [...new Set(allKeys)];
}

export function getJiraUrl(siteUrl: string, issueKey: string): string {
  return `${siteUrl}/browse/${issueKey}`;
}

export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case "highest":
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "low":
    case "lowest":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "done":
    case "closed":
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "in progress":
    case "in review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "to do":
    case "open":
    case "new":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}
