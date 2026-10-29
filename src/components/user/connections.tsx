"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  GitBranch,
  Slack,
  FileText,
  Layers,
  Trello,
  Globe,
  Zap,
  Database,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CheckSquare,
  Building2,
  Kanban,
  LayoutGrid,
  Workflow,
  Unplug,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  status: "available" | "coming-soon";
  href?: string;
  badge?: string;
}

interface JiraConnectionStatus {
  connected: boolean;
  site_url?: string;
  display_name?: string;
  email?: string;
  connected_at?: string;
  is_expired?: boolean;
}

const integrations: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Sync repositories, track commits, and manage pull requests directly within your workspace.",
    icon: GitBranch,
    iconBg: "bg-zinc-950 dark:bg-zinc-50",
    iconColor: "text-white dark:text-zinc-950",
    borderColor: "border-zinc-200 dark:border-zinc-700",
    status: "available",
    href: "/user/github",
    badge: "Connected",
  },
  {
    id: "jira",
    name: "Jira",
    description:
      "Bi-directional sync with Jira issues, sprints and boards for seamless project tracking.",
    icon: Layers,
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-100 dark:border-blue-900/40",
    status: "available",
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Get real-time notifications, project updates and task reminders right in your Slack channels.",
    icon: Slack,
    iconBg: "bg-[#4A154B]/10",
    iconColor: "text-[#4A154B] dark:text-[#E01E5A]",
    borderColor: "border-[#4A154B]/10 dark:border-[#E01E5A]/20",
    status: "coming-soon",
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Sync your Notion docs and databases to keep all your project knowledge in one place.",
    icon: FileText,
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconColor: "text-zinc-900 dark:text-zinc-100",
    borderColor: "border-zinc-200 dark:border-zinc-700",
    status: "coming-soon",
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Streamlined issue tracking and sprint management synced directly with Praxis project boards.",
    icon: Kanban,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-100 dark:border-indigo-900/40",
    status: "coming-soon",
  },
  {
    id: "clickup",
    name: "ClickUp",
    description:
      "Sync tasks, goals, and docs with ClickUp to streamline end-to-end team productivity.",
    icon: CheckSquare,
    iconBg: "bg-pink-50 dark:bg-pink-950/30",
    iconColor: "text-pink-600 dark:text-pink-400",
    borderColor: "border-pink-100 dark:border-pink-900/40",
    status: "coming-soon",
  },
  {
    id: "monday",
    name: "Monday.com",
    description:
      "Connect your Monday Work OS boards to automatically align tasks, deadlines, and progress.",
    icon: LayoutGrid,
    iconBg: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500 dark:text-red-400",
    borderColor: "border-red-100 dark:border-red-900/40",
    status: "coming-soon",
  },
  {
    id: "asana",
    name: "Asana",
    description:
      "Track team projects, milestones, and deliverables automatically synced from Asana.",
    icon: Workflow,
    iconBg: "bg-rose-50 dark:bg-rose-950/30",
    iconColor: "text-rose-500 dark:text-rose-400",
    borderColor: "border-rose-100 dark:border-rose-900/40",
    status: "coming-soon",
  },
  {
    id: "trello",
    name: "Trello",
    description:
      "Import Trello boards and cards to visualize your project workflow inside Praxis.",
    icon: Trello,
    iconBg: "bg-sky-50 dark:bg-sky-950/30",
    iconColor: "text-sky-500 dark:text-sky-400",
    borderColor: "border-sky-100 dark:border-sky-900/40",
    status: "coming-soon",
  },
  {
    id: "google",
    name: "Google Workspace",
    description:
      "Seamlessly integrate Google Drive documents, Calendar events, and Workspace tools.",
    icon: Globe,
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-100 dark:border-amber-900/40",
    status: "coming-soon",
  },
  {
    id: "workday",
    name: "Workday",
    description:
      "Integrate workforce enterprise data, team organization, and HR profiles smoothly.",
    icon: Building2,
    iconBg: "bg-teal-50 dark:bg-teal-950/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-100 dark:border-teal-900/40",
    status: "coming-soon",
  },
  {
    id: "zapier",
    name: "Zapier",
    description:
      "Automate workflows by connecting Praxis with 5,000+ apps using Zapier triggers and actions.",
    icon: Zap,
    iconBg: "bg-orange-50 dark:bg-orange-950/30",
    iconColor: "text-orange-500 dark:text-orange-400",
    borderColor: "border-orange-100 dark:border-orange-900/40",
    status: "coming-soon",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function ConnectionsPage() {
  const router = useRouter();
  const [jiraStatus, setJiraStatus] = useState<JiraConnectionStatus | null>(
    null
  );
  const [jiraLoading, setJiraLoading] = useState(true);
  const [jiraDisconnecting, setJiraDisconnecting] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [jiraProjects, setJiraProjects] = useState<
    Array<{
      id: string;
      key: string;
      name: string;
      type: string;
      description: string;
      lead: string;
    }>
  >([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const fetchJiraStatus = useCallback(async () => {
    try {
      setJiraLoading(true);
      const res = await fetch("/api/jira/connection");
      if (res.ok) {
        const data = await res.json();
        setJiraStatus(data);
      } else {
        setJiraStatus({ connected: false });
      }
    } catch {
      setJiraStatus({ connected: false });
    } finally {
      setJiraLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJiraStatus();
  }, [fetchJiraStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jira") === "connected") {
      fetchJiraStatus();
      window.history.replaceState({}, "", "/user/connections");
    }
  }, [fetchJiraStatus]);

  const handleJiraConnect = () => {
    window.location.href = "/api/jira/oauth/start?redirect=/user/connections";
  };

  const handleJiraDisconnect = async () => {
    try {
      setJiraDisconnecting(true);
      const res = await fetch("/api/jira/connection", { method: "DELETE" });
      if (res.ok) {
        toast.success("Jira disconnected");
        setJiraStatus({ connected: false });
      } else {
        toast.error("Failed to disconnect Jira");
      }
    } catch {
      toast.error("Failed to disconnect Jira");
    } finally {
      setJiraDisconnecting(false);
    }
  };

  const handleViewProjects = async () => {
    try {
      setProjectsLoading(true);
      setProjectsModalOpen(true);
      const res = await fetch("/api/jira/projects");
      if (res.ok) {
        const data = await res.json();
        setJiraProjects(data.projects || []);
      } else {
        toast.error("Failed to load Jira projects");
        setProjectsModalOpen(false);
      }
    } catch {
      toast.error("Failed to load Jira projects");
      setProjectsModalOpen(false);
    } finally {
      setProjectsLoading(false);
    }
  };

  const available = integrations.filter((i) => i.status === "available");
  const comingSoon = integrations.filter((i) => i.status === "coming-soon");

  return (
    <div className="flex flex-col gap-8 px-1 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            Connections
          </h1>
          <Badge
            variant="outline"
            className="h-5 px-2 text-[10px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
          >
            {available.length} Active
          </Badge>
        </div>
        <p className="text-sm text-zinc-500 dark:text-[#A1A1AA]">
          Connect your favorite tools and services to supercharge your workflow.
        </p>
      </motion.div>

      {/* Available integrations */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Available Now
          </span>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {available.map((integration) => {
            const Icon = integration.icon;
            const isJira = integration.id === "jira";
            const isGitHub = integration.id === "github";
            const jiraConnected = isJira && jiraStatus?.connected;
            const jiraExpired = isJira && jiraStatus?.is_expired;

            return (
              <motion.div
                key={integration.id}
                variants={cardVariants}
                onClick={() => {
                  if (isJira) {
                    if (jiraConnected) {
                      handleViewProjects();
                    } else {
                      handleJiraConnect();
                    }
                  } else if (integration.href) {
                    router.push(integration.href);
                  }
                }}
                className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-[#1E1F23] bg-white dark:bg-[#111214] cursor-pointer hover:border-zinc-400 dark:hover:border-[#26272B] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
              >
                {/* Status indicator */}
                {isGitHub && (
                  <span className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  </span>
                )}

                {isJira && jiraLoading && (
                  <span className="absolute top-4 right-4">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  </span>
                )}

                {isJira && !jiraLoading && jiraConnected && (
                  <span className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </span>
                )}

                {isJira && !jiraLoading && jiraExpired && (
                  <span className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Expired
                    </span>
                  </span>
                )}

                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center ${integration.iconBg} border ${integration.borderColor}`}
                >
                  <Icon className={`h-5 w-5 ${integration.iconColor}`} />
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <p className="text-[13px] font-bold text-zinc-950 dark:text-zinc-50">
                    {integration.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {integration.description}
                  </p>
                  {isJira && jiraConnected && jiraStatus?.site_url && (
                    <div className="flex items-center gap-1 mt-1">
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[180px]">
                        {jiraStatus.site_url.replace("https://", "")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-[#1E1F23]">
                  {isJira && jiraConnected ? (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                        ✓ Active
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJiraDisconnect();
                        }}
                        disabled={jiraDisconnecting}
                        className="text-[10px] font-semibold text-zinc-400 dark:text-[#71717A] uppercase tracking-wider hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {jiraDisconnecting ? "..." : "Disconnect"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-[#71717A] uppercase tracking-wider">
                        Configure
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-[#F5F5F5] group-hover:translate-x-0.5 transition-all duration-150" />
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Coming soon integrations */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Coming Soon
          </span>
          <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-200/50 dark:border-violet-800/40">
            <Sparkles className="h-2.5 w-2.5 text-violet-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Roadmap
            </span>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {comingSoon.map((integration) => {
            const Icon = integration.icon;
            return (
              <motion.div
                key={integration.id}
                variants={cardVariants}
                className="relative flex flex-col gap-4 p-5 rounded-2xl border border-dashed border-zinc-200 dark:border-[#1E1F23] bg-zinc-50/50 dark:bg-[#111214]/50 select-none"
              >
                {/* Coming soon overlay badge */}
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-[#17181C] text-zinc-400 dark:text-[#71717A] border border-zinc-200 dark:border-[#26272B]">
                  Soon
                </span>

                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center opacity-50 ${integration.iconBg} border ${integration.borderColor}`}
                >
                  <Icon className={`h-5 w-5 ${integration.iconColor}`} />
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <p className="text-[13px] font-bold text-zinc-400 dark:text-zinc-500">
                    {integration.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-600 leading-relaxed line-clamp-3">
                    {integration.description}
                  </p>
                </div>

                <div className="pt-1 border-t border-zinc-100 dark:border-[#1E1F23]">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="h-7 px-0 text-[10px] text-zinc-400 dark:text-zinc-600 font-semibold uppercase tracking-wider cursor-not-allowed opacity-60"
                  >
                    Not available yet
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Jira Projects Modal */}
      {projectsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setProjectsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#111214] rounded-2xl border border-zinc-200 dark:border-[#1E1F23] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-[#1E1F23]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    Jira Projects
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {jiraStatus?.site_url?.replace("https://", "") || "Jira"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProjectsModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#17181C] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <div className="p-5 max-h-[400px] overflow-y-auto">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  <span className="ml-2 text-sm text-zinc-500">
                    Loading projects...
                  </span>
                </div>
              ) : jiraProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No projects found
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {jiraProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-[#1E1F23] hover:bg-zinc-50 dark:hover:bg-[#17181C] transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                        {project.key.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50 truncate">
                          {project.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {project.key}
                          {project.lead && ` · ${project.lead}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 dark:border-[#1E1F23]">
              <Button
                onClick={() => setProjectsModalOpen(false)}
                className="w-full h-9 text-[13px] font-semibold bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl"
              >
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
