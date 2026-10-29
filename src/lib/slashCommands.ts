"use client";

// Slash Command Registry for Kiyo Developer OS
// Each command maps a slash-trigger (e.g., "/tasks") to an action the support agent executes.

export type SlashCommandCategory = "view" | "create" | "ai" | "system";

export interface SlashCommand {
  /** The slash trigger, e.g. "/tasks" */
  name: string;
  /** Shorter aliases e.g. ["/t"] */
  aliases: string[];
  /** Human-readable description shown in the command menu */
  description: string;
  /** Lucide icon name (matched in the menu component) */
  icon: string;
  /** Category for grouping in the command palette */
  category: SlashCommandCategory;
  /** 
   * The message that gets sent to the support agent when this command runs.
   * For "view" commands this is the quick-action key (e.g. "all tasks").
   * For "create" commands this is a natural-language instruction.
   */
  actionKey: string;
  /**
   * Whether this command triggers a quick-action handler (true) or sends
   * the actionKey as a free-text message to the agent (false).
   */
  isQuickAction: boolean;
  /**
   * Optional: roles that are allowed to use this command.
   * If empty / undefined, all authenticated users can use it.
   * Checked at runtime against the current user's role + subrole.
   */
  allowedRoles?: string[];
  /**
   * Optional: sub-roles that are allowed (checked in addition to allowedRoles).
   */
  allowedSubRoles?: string[];
}

// ─── View Commands (read-only, available to ALL users) ─────────────────────

const viewCommands: SlashCommand[] = [
  {
    name: "/tasks",
    aliases: ["/t", "/mytasks"],
    description: "View all your tasks",
    icon: "ClipboardList",
    category: "view",
    actionKey: "all tasks",
    isQuickAction: true,
  },
  {
    name: "/projects",
    aliases: ["/p", "/myprojects"],
    description: "View all your projects",
    icon: "FolderKanban",
    category: "view",
    actionKey: "projects",
    isQuickAction: true,
  },
  {
    name: "/notifications",
    aliases: ["/n", "/notif"],
    description: "View your notifications",
    icon: "Bell",
    category: "view",
    actionKey: "notifications",
    isQuickAction: true,
  },
  {
    name: "/feedback",
    aliases: ["/fb", "/codefeedback"],
    description: "View your code feedback",
    icon: "MessageSquareCode",
    category: "view",
    actionKey: "code feedback",
    isQuickAction: true,
  },
  {
    name: "/prs",
    aliases: ["/pullrequests", "/pr"],
    description: "View your pull requests",
    icon: "GitPullRequest",
    category: "view",
    actionKey: "pull requests",
    isQuickAction: true,
  },
  {
    name: "/plans",
    aliases: ["/projectplans", "/pp"],
    description: "View your project plans",
    icon: "FileText",
    category: "view",
    actionKey: "project plans",
    isQuickAction: true,
  },
  {
    name: "/profile",
    aliases: ["/me", "/myprofile"],
    description: "View your complete profile",
    icon: "User",
    category: "view",
    actionKey: "complete profile",
    isQuickAction: true,
  },
];

// ─── AI Commands (analysis/recommendations, available to ALL users) ────────

const aiCommands: SlashCommand[] = [
  {
    name: "/progress",
    aliases: ["/prog", "/myprogress"],
    description: "Analyze your progress & stats",
    icon: "BarChart3",
    category: "ai",
    actionKey: "progress",
    isQuickAction: true,
  },
  {
    name: "/recommend",
    aliases: ["/rec", "/suggestions"],
    description: "Get AI recommendations",
    icon: "TrendingUp",
    category: "ai",
    actionKey: "recommendations",
    isQuickAction: true,
  },
  {
    name: "/next",
    aliases: ["/nextaction", "/whatnext"],
    description: "Get your next recommended action",
    icon: "Target",
    category: "ai",
    actionKey: "next action",
    isQuickAction: true,
  },
];

// ─── Create Commands (write operations, restricted to owner/admin/manager) ─

const createCommands: SlashCommand[] = [
  {
    name: "/create project",
    aliases: ["/newproject", "/cp"],
    description: "Create a new project",
    icon: "FolderPlus",
    category: "create",
    actionKey: "Create a new project for me. Ask me for the details.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/create task",
    aliases: ["/newtask", "/ct"],
    description: "Create a new task",
    icon: "ListPlus",
    category: "create",
    actionKey: "Create a new task for me. Ask me for the details like title, description, priority, and project.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/create plan",
    aliases: ["/newplan", "/cpn"],
    description: "Create a plan for a project",
    icon: "ClipboardList",
    category: "create",
    actionKey: "Create a new project plan for me. Ask me for the project.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/generate tasks",
    aliases: ["/gentasks", "/gt"],
    description: "Generate AI tasks for a project",
    icon: "Sparkles",
    category: "create",
    actionKey: "Generate AI tasks for a project.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/generate subtasks",
    aliases: ["/gensubtasks", "/gs"],
    description: "Generate AI sub-tasks for a task",
    icon: "Brain",
    category: "create",
    actionKey: "Generate AI sub-tasks for a task.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/create assessment",
    aliases: ["/newassessment", "/ca"],
    description: "Create an AI assessment for a project",
    icon: "FileText",
    category: "create",
    actionKey: "Create an AI assessment for a project.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/delete task",
    aliases: ["/deltask", "/dt"],
    description: "Delete a task",
    icon: "Trash2",
    category: "create",
    actionKey: "Delete a task.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/delete project",
    aliases: ["/delproject", "/dp"],
    description: "Delete a project",
    icon: "FolderMinus",
    category: "create",
    actionKey: "Delete a project.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
  {
    name: "/update task",
    aliases: ["/edittask", "/ut"],
    description: "Update task status or priority",
    icon: "Edit2",
    category: "create",
    actionKey: "Update task status or priority.",
    isQuickAction: false,
    allowedRoles: ["owner"],
    allowedSubRoles: ["admin"],
  },
];

const systemCommands: SlashCommand[] = [
  {
    name: "/help",
    aliases: ["/h", "/commands"],
    description: "Show all available commands",
    icon: "HelpCircle",
    category: "system",
    actionKey: "__help__",
    isQuickAction: false,
  },
  {
    name: "/link github",
    aliases: ["/connectgithub", "/lg"],
    description: "Link/authorize your GitHub account",
    icon: "Github",
    category: "system",
    actionKey: "__link_github__",
    isQuickAction: false,
  },
  {
    name: "/sync github",
    aliases: ["/refreshgithub", "/sg"],
    description: "Sync your recent GitHub commits and repositories",
    icon: "RefreshCw",
    category: "system",
    actionKey: "__sync_github__",
    isQuickAction: false,
  },
];

// ─── Full Registry ─────────────────────────────────────────────────────────

export const SLASH_COMMANDS: SlashCommand[] = [
  ...viewCommands,
  ...aiCommands,
  ...createCommands,
  ...systemCommands,
];

// ─── Category Labels ───────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  view: "View Data",
  create: "Create",
  ai: "AI Analysis",
  system: "System",
};

export const CATEGORY_ORDER: SlashCommandCategory[] = ["view", "create", "ai", "system"];

// ─── Search / Filter helper ────────────────────────────────────────────────

/**
 * Filter commands by partial query (what the user typed after "/").
 * Also checks aliases. Case-insensitive.
 */
export function filterSlashCommands(
  query: string,
  userRole?: string | null,
  userSubRole?: string | null,
): SlashCommand[] {
  const q = query.toLowerCase().replace(/^\//, "");

  return SLASH_COMMANDS.filter((cmd) => {
    // Role check
    if (cmd.allowedRoles && cmd.allowedRoles.length > 0) {
      const roleMatch = userRole && cmd.allowedRoles.includes(userRole);
      const subRoleMatch =
        userSubRole &&
        cmd.allowedSubRoles &&
        cmd.allowedSubRoles.includes(userSubRole);
      if (!roleMatch && !subRoleMatch) return false;
    }

    // Text match
    if (!q) return true; // show all if just "/"
    const nameMatch = cmd.name.toLowerCase().replace(/^\//, "").includes(q);
    const aliasMatch = cmd.aliases.some((a) =>
      a.toLowerCase().replace(/^\//, "").includes(q),
    );
    const descMatch = cmd.description.toLowerCase().includes(q);
    return nameMatch || aliasMatch || descMatch;
  });
}

/**
 * Find exact command match for a given input string.
 * Returns the command if the input starts with a known slash command.
 */
export function matchSlashCommand(
  input: string,
  userRole?: string | null,
  userSubRole?: string | null,
): SlashCommand | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return null;

  // Sort by name length descending so longer commands match first
  // e.g., "/create project" matches before "/create"
  const sorted = [...SLASH_COMMANDS].sort(
    (a, b) => b.name.length - a.name.length,
  );

  for (const cmd of sorted) {
    const names = [cmd.name, ...cmd.aliases];
    for (const name of names) {
      if (trimmed === name.toLowerCase() || trimmed.startsWith(name.toLowerCase() + " ")) {
        // Role check
        if (cmd.allowedRoles && cmd.allowedRoles.length > 0) {
          const roleMatch = userRole && cmd.allowedRoles.includes(userRole);
          const subRoleMatch =
            userSubRole &&
            cmd.allowedSubRoles &&
            cmd.allowedSubRoles.includes(userSubRole);
          if (!roleMatch && !subRoleMatch) return null;
        }
        return cmd;
      }
    }
  }
  return null;
}

/**
 * Generate the help text listing all available commands.
 */
export function generateHelpText(
  userRole?: string | null,
  userSubRole?: string | null,
): string {
  const available = filterSlashCommands("", userRole, userSubRole);
  const grouped = CATEGORY_ORDER.map((cat) => ({
    label: CATEGORY_LABELS[cat],
    commands: available.filter((c) => c.category === cat),
  })).filter((g) => g.commands.length > 0);

  let output = "## ⌨️ Available Commands\n\n";
  for (const group of grouped) {
    output += `### ${group.label}\n`;
    for (const cmd of group.commands) {
      const aliasStr =
        cmd.aliases.length > 0 ? ` *(${cmd.aliases.join(", ")})*` : "";
      output += `- **${cmd.name}**${aliasStr} — ${cmd.description}\n`;
    }
    output += "\n";
  }
  output += "---\n*Type `/` followed by a command name, or just type naturally to chat with the AI agent.*";
  return output;
}
