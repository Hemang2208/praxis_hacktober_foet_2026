"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { PLANNER_AGENT_URL, TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import {
  fetchProjectById,
  refineProjectTasks,
  updateProject,
} from "@/redux/slice/project.slice";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/dashboard/plan/TaskCard";
import SidebarSummary from "@/components/dashboard/plan/SidebarSummary";
import Collapse from "@/components/dashboard/plan/Collapse";
import { ArrowLeft, Target, CheckCircle2, Users } from "lucide-react";
import toast from "react-hot-toast";
import jspdf from "jspdf";
import useUserProfile from "@/hooks/useUserProfile";
import { canManageCompanyProjects, getViewerCompanySubrole } from "@/lib/company-rbac";
import { useAppDispatch, useUser } from "@/redux/hooks";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import useMutationSync from "@/hooks/useMutationSync";

export default function ProjectPlanPage() {
  // Refine Plan click counter state
  const [refineCount, setRefineCount] = useState(0);
  const maxRefine = 3;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const dispatch = useAppDispatch();
  const project_id = params.project_id as string;
  const { mongoUser } = useUserProfile() || { mongoUser: null };

  const { refined_tasks, loading, refiningTasks, currentProject } = useSelector(
    (state: RootState) => ({
      refined_tasks: state.project.refined_tasks,
      loading: state.project.loading.fetchPlanFromDB,
      refiningTasks: state.project.loading.refineTasks,
      currentProject: state.project.currentProject,
    }),
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [planExists, setPlanExists] = useState<boolean | null>(null);
  const [agentProjectData, setAgentProjectData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const { execute: executeRefine } = useMutationSync({
    successMessage: "🎉 Project tasks refined and saved successfully!",
    invalidateSWRKeys: ["/api/auth/current-user"],
    onSuccess: (_result) => {
      const refinementResult = _result as {
        refined_tasks: {
          project_id: string;
          refined_tasks: unknown[];
          high_level_tasks?: unknown[];
        };
      };
      if (
        refinementResult?.refined_tasks &&
        (refinementResult.refined_tasks.refined_tasks ||
          refinementResult.refined_tasks.high_level_tasks)
      ) {
        const refinedData = {
          ...agentProjectData,
          high_level_tasks:
            refinementResult.refined_tasks.refined_tasks ||
            refinementResult.refined_tasks.high_level_tasks,
          updated_at: new Date().toISOString(),
        };
        setAgentProjectData(refinedData as Record<string, unknown>);
        setPlanExists(true);
      }
      setRefineCount((prev) => prev + 1);
      setRefetchKey((k) => k + 1);
    },
  });
  const { user: reduxUser } = useUser();
  const viewerCompanySubrole =
    getViewerCompanySubrole(mongoUser as any) ||
    getViewerCompanySubrole(reduxUser as any) ||
    (mongoUser as any)?.company_subrole ||
    (reduxUser as any)?.company_subrole ||
    (mongoUser as any)?.activeCompanyMembership?.subrole ||
    (reduxUser as any)?.activeCompanyMembership?.subrole ||
    (mongoUser as any)?.subrole ||
    (reduxUser as any)?.subrole ||
    null;

  const canManagePlan = viewerCompanySubrole === "owner" || viewerCompanySubrole === "admin";
  // debug raw response view removed for cleaner UI

  // Map agent response to the UI shape (normalise alternative keys)
  const mapAgentPlan = (raw: Record<string, unknown> | null) => {
    if (!raw) return null;
    const get = (keys: string[]) => {
      for (const k of keys) {
        if (raw[k] !== undefined) return raw[k];
      }
      return undefined;
    };

    let summary = String(get(["summary", "summary", "description"]) ?? "");

    let key_features_deliverables = (get([
      "key_features_deliverables",
      "features",
      "deliverables",
    ]) || []) as unknown[];

    const major_milestones = (get([
      "major_milestones",
      "milestones",
      "timeline",
    ]) || []) as unknown[];

    const high_level_tasks = (get([
      "high_level_tasks",
      "tasks",
      "high_level_task_list",
    ]) || []) as unknown[];

    const created_at = String(
      get(["created_at", "created_at", "created"]) ||
        raw["created_at"] ||
        raw["created_at"] ||
        "",
    );
    const updated_at = String(
      get(["updated_at", "updated_at", "updated"]) ||
        raw["updated_at"] ||
        raw["updated_at"] ||
        "",
    );

    // Helper: try to pull a concise summary from the first available task/subtask description
    const tryExtractSummary = () => {
      if (Array.isArray(high_level_tasks) && high_level_tasks.length > 0) {
        const first = high_level_tasks[0] as Record<string, unknown>;
        if (first) {
          const desc = (first["description"] ||
            first["details"] ||
            first["summary"]) as string | undefined;
          if (desc && String(desc).trim().length > 0)
            return String(desc).trim();
          // look into sub_tasks
          const sub_tasks = first["sub_tasks"] as unknown[] | undefined;
          if (Array.isArray(sub_tasks) && sub_tasks.length > 0) {
            const s0 = sub_tasks[0] as Record<string, unknown>;
            const sdesc =
              s0 && (s0["description"] || s0["details"] || s0["summary"]);
            if (sdesc && String(sdesc).trim().length > 0)
              return String(sdesc).trim();
          }
        }
      }
      return null;
    };

    // If summary missing, synthesize one from task descriptions
    if (!summary || summary.trim() === "") {
      const synthesized = tryExtractSummary();
      if (synthesized) summary = synthesized;
    }

    // If key features empty, derive from high level task names
    if (
      (!Array.isArray(key_features_deliverables) ||
        key_features_deliverables.length === 0) &&
      Array.isArray(high_level_tasks)
    ) {
      key_features_deliverables = high_level_tasks
        .map((t) => {
          const trec = t as Record<string, unknown>;
          return (
            trec["task_name"] ||
            trec["name"] ||
            trec["title"] ||
            trec["summary"] ||
            ""
          );
        })
        .filter(Boolean);
    }

    return {
      ...raw,
      summary,
      key_features_deliverables,
      major_milestones,
      high_level_tasks,
      created_at,
      updated_at,
    } as Record<string, unknown>;
  };

  const mappedPlan = mapAgentPlan(agentProjectData);
  const ep = mappedPlan as Record<string, unknown> | null;

  useEffect(() => {
    if (project_id) {
      dispatch(fetchProjectById(project_id));

      // Check planner-agent directly for project details/plan
      (async () => {
        try {
          const token = await fastAPIAuthService.getAccessToken();
          const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
          
          const res = await fetch(
            `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(
              project_id,
            )}/plan`,
            {
              headers: { ...authHeader },
              credentials: "include",
              cache: "no-store",
            },
          );
          if (!res.ok) {
            setPlanExists(false);
            return;
          }
          const pd = await res.json().catch(() => null);
          // Normalise response shapes: some agents return { plan: {...} } or { project: {...} }
          const projectObj = pd?.plan || pd?.project || pd || null;
          // If we received a wrapper object (e.g. { plan: {...} }), prefer inner plan
          if (
            projectObj &&
            (projectObj as Record<string, unknown>)["summary"]
          ) {
            setAgentProjectData(projectObj as Record<string, unknown>);
            setPlanExists(true);
          } else if (pd && (pd.plan || pd.project)) {
            // pd contained a wrapper; unwrap and set
            const inner = pd.plan || pd.project;
            setAgentProjectData(inner as Record<string, unknown>);
            setPlanExists(true);
          } else {
            // Fallback: set whatever we received and mark based on presence
            setAgentProjectData(projectObj as Record<string, unknown> | null);
            setPlanExists(
              Boolean(projectObj && Object.keys(projectObj).length > 0),
            );
          }
          if (pd && !projectObj)
            console.debug("Unexpected planner-agent plan shape:", pd);
        } catch (e) {
          console.error("Failed to fetch project from planner-agent:", e);
          setPlanExists(false);
        }
      })();
    }
  }, [project_id, dispatch, refetchKey]);

  const handlefetchProjectPlan = async () => {
    if (!canManagePlan) {
      toast.error("You do not have permission to generate project plans.");
      return;
    }

    try {
      setIsGenerating(true);

      const token = await fastAPIAuthService.getAccessToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("🔍 QUEUE_COMPLETED — handlefetchProjectPlan polling finished");
      const genRes = await queueAwareFetch(
        `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(
          project_id,
        )}/plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          credentials: "include",
          body: JSON.stringify({}),
        },
        { maxPollAttempts: 45, pollIntervalMs: 2000 },
      );

      if (!genRes.ok) {
        let msg = `Failed to generate plan (status ${genRes.status})`;
        try {
          const err = await genRes.json();
          msg = err?.message || err?.detail || msg;
        } catch {}
        if (
          genRes.status === 400 &&
          msg.toLowerCase().includes("already exists")
        ) {
          try {
            const existingRes = await queueAwareFetch(
              `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                credentials: "include",
                body: JSON.stringify({}),
              },
              { maxPollAttempts: 45, pollIntervalMs: 2000 },
            );
            if (existingRes.ok) {
              const pd = await existingRes.json().catch(() => null);
              if (isQueueResponse(pd)) {
                toast.error("Plan data is not ready yet. Please refresh.");
                return;
              }
              const existingPlan = pd?.plan || pd || null;
              setAgentProjectData(
                existingPlan as Record<string, unknown> | null,
              );
              setPlanExists(Boolean(existingPlan));
              toast.success(
                "Project plan already exists. Loaded existing plan.",
              );
              return;
            }
          } catch (e) {
            console.warn("Failed to load existing plan after 400 response", e);
          }
        }
        toast.error(msg);
        return;
      }

      const generatedPlan = await genRes.json().catch(() => null);
      console.log("🔍 RESULT_RECEIVED — handlefetchProjectPlan got plan data");

      // If polling timed out and we got back queue metadata instead of plan data,
      // the plan is still being processed on the backend — don't try to PATCH it.
      if (isQueueResponse(generatedPlan)) {
        toast.success(
          "Plan generation is in progress. Please wait a moment and refresh the page.",
        );
        setPlanExists(true);
        return;
      }

      // Persist to planner-agent via updateProject thunk
      try {
        await dispatch(updateProject({
          id: project_id,
          updates: generatedPlan || {},
        })).unwrap();
      } catch (err) {
        const msg = typeof err === "string" ? err : "Failed to save plan";
        toast.error(msg);
        return;
      }

      // Fetch fresh project data to update Redux store
      await dispatch(fetchProjectById(project_id));
      console.log("🔍 PROJECT_REFETCHED — fetchProjectById completed");
      setAgentProjectData(generatedPlan as Record<string, unknown> | null);
      setPlanExists(true);
      console.log("🔍 UI_RERENDERED — agentProjectData updated");
      toast.success("Project plan generated and saved");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateNewPlan = async () => {
    if (!canManagePlan) {
      toast.error("You do not have permission to refine project plans.");
      return;
    }

    if (refineCount >= maxRefine) {
      toast.error("Refine Plan button disabled");
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`🔍 Starting task refinement for project: ${project_id}`);
      const result = await executeRefine(refineProjectTasks(project_id));
      console.log("🔍 THUNK_RESOLVED — refineProjectTasks fulfilled via useMutationSync");

      // Extract refined tasks from the result
      const refinementResult = result as {
        refined_tasks: {
          project_id: string;
          refined_tasks: unknown[];
          high_level_tasks?: unknown[];
        };
      };

      if (
        refinementResult &&
        refinementResult.refined_tasks &&
        (refinementResult.refined_tasks.refined_tasks ||
          refinementResult.refined_tasks.high_level_tasks)
      ) {
        const refinedData = {
          ...agentProjectData,
          high_level_tasks:
            refinementResult.refined_tasks.refined_tasks ||
            refinementResult.refined_tasks.high_level_tasks,
          updated_at: new Date().toISOString(),
        };
        setAgentProjectData(refinedData as Record<string, unknown>);
        setPlanExists(true);
      }

      setRefineCount((prev) => prev + 1);
      setRefetchKey((k) => k + 1);
      console.log("🔍 UI_RERENDERED — agentProjectData updated with refined tasks");
    } catch {
      // Error toast is handled by useMutationSync
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoBack = () => {
    const projectsBasePath = pathname.startsWith("/user/projects/")
      ? "/user/projects"
      : "/dashboard/projects";
    router.push(`${projectsBasePath}/${project_id}`);
  };

  if (loading || planExists === null) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2 text-black">
              {loading ? "Loading Project Plan..." : "Checking Project Plan..."}
            </h3>
            <p className="text-gray-600">
              Please wait while we check your project plan details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!ep || !planExists) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-black">
              No Project Plan Found
            </h3>
            <p className="text-gray-600 mb-6">
              This project doesn&#39;t have a plan yet. Generate one to get
              started with detailed milestones and tasks.
            </p>
            <Button
              onClick={handlefetchProjectPlan}
              disabled={refiningTasks || isGenerating}
              className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-600"
            >
              {refiningTasks || isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Generate Project Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Hero header */}
      <section className="rounded-3xl overflow-hidden mb-8 relative bg-gray-900 text-white p-8 shadow-2xl border border-gray-700">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-gray-700 via-transparent to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold">Project Plan</h1>
            {currentProject && (
              <p className="mt-1 opacity-90">{currentProject.title}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full text-sm border border-gray-600">
              <CheckCircle2 className="w-4 h-4" /> Plan Active
            </span>
            {canManagePlan && (
              <Button
                onClick={handleGenerateNewPlan}
                disabled={
                  refiningTasks || isGenerating || refineCount >= maxRefine
                }
                className={
                  refiningTasks || isGenerating || refineCount >= maxRefine
                    ? "bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
                    : "bg-white text-black hover:bg-gray-100 border border-gray-300"
                }
              >
                {refiningTasks || isGenerating
                  ? "Refining..."
                  : refineCount >= maxRefine
                    ? "Refine Plan (Disabled)"
                    : "Refine Plan"}
              </Button>
            )}
            {/* Raw response toggle removed */}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <main className="lg:col-span-2 space-y-6">
          {/* Unified Overview section */}
          <section className="rounded-2xl p-6 bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#1E1F23] shadow-sm">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-[#F5F5F5] mb-4">Overview</h2>

            <Collapse
              title={
                <span className="flex items-center gap-2 text-zinc-900 dark:text-[#F5F5F5] font-semibold text-sm">
                  <Target className="w-4 h-4 text-emerald-500" />{" "}
                  Project Summary
                </span>
              }
              defaultOpen
              hideToggle
            >
              <p className="text-zinc-700 dark:text-[#A1A1AA] mb-4 text-sm leading-relaxed">
                {String(ep?.["summary"] ?? "")}
              </p>
            </Collapse>

            <div className="mt-4">
              <Collapse
                title={
                  <span className="flex items-center gap-2 text-zinc-900 dark:text-[#F5F5F5] font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />{" "}
                    Key Features & Deliverables
                  </span>
                }
                hideToggle
              >
                <ul className="space-y-2.5 text-zinc-800 dark:text-[#F5F5F5] text-sm">
                  {(Array.isArray(ep?.["key_features_deliverables"])
                    ? (ep!["key_features_deliverables"] as unknown[])
                    : []
                  ).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                      <span>{String(feature ?? "")}</span>
                    </li>
                  ))}
                </ul>
              </Collapse>
            </div>
          </section>

          {/* Full-width High-Level Tasks section */}
          <section className="rounded-2xl p-6 bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#1E1F23] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-zinc-950 dark:text-[#F5F5F5]">
                High-Level Tasks
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Array.isArray(ep?.["high_level_tasks"])
                ? (ep!["high_level_tasks"] as unknown[])
                : []
              ).map((task, idx) => {
                const t = task as unknown as Record<string, unknown>;
                const sub_tasks = Array.isArray(t["sub_tasks"])
                  ? (t["sub_tasks"] as unknown[])
                  : [];
                const techReqs = Array.isArray(t["technical_requirements"])
                  ? (t["technical_requirements"] as unknown[])
                  : [];
                const deps = Array.isArray(t["dependencies"])
                  ? (t["dependencies"] as unknown[])
                  : [];
                const effort =
                  t["effort"] ||
                  t["estimated_effort"] ||
                  t["estimated_duration"] ||
                  "";

                return (
                  <div
                    key={idx}
                    className="p-4 bg-zinc-50 dark:bg-[#17181C] rounded-xl border border-zinc-200/60 dark:border-[#26272B] shadow-sm min-h-[96px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-zinc-950 dark:text-[#F5F5F5]">
                        {String(
                          t["task_name"] ?? t["name"] ?? t["title"] ?? "",
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                        {String(effort ?? "")}
                      </div>
                    </div>

                    {String(t["description"] ?? t["details"] ?? "").length >
                      0 && (
                      <div className="text-xs text-zinc-600 dark:text-[#A1A1AA] mt-2 leading-relaxed">
                        {String(t["description"] ?? t["details"] ?? "")}
                      </div>
                    )}

                    {techReqs.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] text-zinc-400 dark:text-[#71717A]">
                          Tech requirements:
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {techReqs.map((tr, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[11px] bg-zinc-100 dark:bg-[#111214] text-zinc-800 dark:text-[#F5F5F5] border border-zinc-200 dark:border-[#26272B] rounded-md font-medium"
                            >
                              {String(tr ?? "")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {sub_tasks.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] text-zinc-400 dark:text-[#71717A] mb-1.5 font-medium">
                          Subtasks
                        </div>
                        <div className="space-y-2">
                          {sub_tasks.map((st, sidx) => {
                            const srec = st as unknown as Record<
                              string,
                              unknown
                            >;
                            const sEffort =
                              srec["effort"] || srec["estimated_effort"] || "";
                            const sTech = Array.isArray(
                              srec["technical_requirements"],
                            )
                              ? (srec["technical_requirements"] as unknown[])
                              : [];
                            return (
                              <div
                                key={sidx}
                                className="p-2.5 bg-white dark:bg-[#111214] rounded-lg border border-zinc-200/60 dark:border-[#26272B]"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-zinc-900 dark:text-[#F5F5F5]">
                                    {String(
                                      srec["name"] ??
                                        srec["title"] ??
                                        srec["task_name"] ??
                                        "",
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 dark:text-[#71717A]">
                                    {String(sEffort ?? "")}
                                  </div>
                                </div>
                                {String(srec["description"] ?? "").length >
                                  0 && (
                                  <div className="text-[11px] text-zinc-500 dark:text-[#A1A1AA] mt-1">
                                    {String(srec["description"] ?? "")}
                                  </div>
                                )}
                                {sTech.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {sTech.map((tr, ti) => (
                                      <span
                                        key={ti}
                                        className="px-2 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-md font-medium"
                                      >
                                        {String(tr ?? "")}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {deps.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] text-zinc-400 dark:text-[#71717A]">
                          Dependencies
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {deps.map((d, di) => (
                            <span
                              key={di}
                              className="px-2 py-0.5 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-md font-medium"
                            >
                              {String(d ?? "")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Detailed Refined Tasks */}
          {refined_tasks &&
            refined_tasks.refined_tasks &&
            refined_tasks.refined_tasks.length > 0 && (
              <section className="rounded-2xl p-6 bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#1E1F23] shadow-sm mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-[#F5F5F5]">
                    Refined Task Details
                  </h3>
                </div>
                <div className="space-y-2">
                  {refined_tasks.refined_tasks.map((task, index) => (
                    <TaskCard key={index} task={task} />
                  ))}
                </div>
              </section>
            )}
        </main>

        <aside className="lg:col-span-1 space-y-6">
          {/* Quick actions / refinement */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#1E1F23] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />{" "}
                <span className="font-bold text-sm text-zinc-950 dark:text-[#F5F5F5]">Plan Actions</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {canManagePlan && (
                <Button
                  onClick={handleGenerateNewPlan}
                  disabled={
                    refiningTasks || isGenerating || refineCount >= maxRefine
                  }
                  className={
                    refiningTasks || isGenerating || refineCount >= maxRefine
                      ? "bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-xl text-xs font-semibold h-9"
                      : "bg-zinc-100 dark:bg-[#17181C] text-zinc-900 dark:text-[#F5F5F5] hover:bg-zinc-200 dark:hover:bg-[#26272B] border border-zinc-200 dark:border-[#26272B] rounded-xl text-xs font-semibold h-9"
                  }
                >
                  {refiningTasks || isGenerating
                    ? "Refining..."
                    : refineCount >= maxRefine
                      ? "Refine Plan (Disabled)"
                      : "Refine Plan"}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={async () => {
                  const doc = new jspdf({ unit: "mm", format: "a4" });
                  const pageHeight = doc.internal.pageSize.getHeight();
                  let y = 20;
                  doc.setFontSize(22);
                  doc.text("Project Plan", 105, y, { align: "center" });
                  y += 12;
                  doc.setFontSize(14);
                  doc.text("Summary:", 10, y);
                  y += 8;
                  doc.setFontSize(12);
                  if (ep?.["summary"]) {
                    const summaryLines = doc.splitTextToSize(
                      String(ep["summary"]),
                      185,
                    );
                    summaryLines.forEach((line) => {
                      if (y > pageHeight - 15) {
                        doc.addPage();
                        y = 20;
                      }
                      doc.text(line, 12, y);
                      y += 7;
                    });
                  }
                  y += 6;
                  doc.setFontSize(14);
                  doc.text("Key Features & Deliverables:", 10, y);
                  y += 8;
                  doc.setFontSize(12);
                  if (Array.isArray(ep?.["key_features_deliverables"])) {
                    (ep["key_features_deliverables"] as string[]).forEach(
                      (f) => {
                        if (y > pageHeight - 15) {
                          doc.addPage();
                          y = 20;
                        }
                        doc.text("- " + f, 14, y);
                        y += 6;
                      },
                    );
                  }
                  y += 6;
                  doc.setFontSize(14);
                  doc.text("High-Level Tasks:", 10, y);
                  y += 8;
                  doc.setFontSize(12);
                  type TaskType = {
                    task_name?: string;
                    name?: string;
                    title?: string;
                    description?: string;
                    sub_tasks?: SubtaskType[];
                  };
                  type SubtaskType = {
                    name?: string;
                    title?: string;
                    task_name?: string;
                    description?: string;
                  };
                  if (Array.isArray(ep?.["high_level_tasks"])) {
                    (ep["high_level_tasks"] as TaskType[]).forEach((t, i) => {
                      if (y > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                      }
                      doc.setFontSize(12);
                      doc.text(
                        `${i + 1}. ${t.task_name || t.name || t.title || "Task"}`,
                        14,
                        y,
                      );
                      y += 7;
                      if (t.description) {
                        const descLines = doc.splitTextToSize(
                          t.description,
                          170,
                        );
                        descLines.forEach((line) => {
                          if (y > pageHeight - 15) {
                            doc.addPage();
                            y = 20;
                          }
                          doc.setFontSize(10);
                          doc.text("   " + line, 16, y);
                          y += 6;
                        });
                        doc.setFontSize(12);
                      }
                      if (Array.isArray(t.sub_tasks)) {
                        t.sub_tasks.forEach((st) => {
                          if (y > pageHeight - 15) {
                            doc.addPage();
                            y = 20;
                          }
                          doc.setFontSize(11);
                          doc.text(
                            `    - ${st.name || st.title || st.task_name || "Subtask"}`,
                            18,
                            y,
                          );
                          y += 6;
                          if (st.description) {
                            const subDescLines = doc.splitTextToSize(
                              st.description,
                              160,
                            );
                            subDescLines.forEach((line) => {
                              if (y > pageHeight - 15) {
                                doc.addPage();
                                y = 20;
                              }
                              doc.setFontSize(10);
                              doc.text(`      ${line}`, 20, y);
                              y += 5;
                            });
                          }
                        });
                        doc.setFontSize(12);
                      }
                      y += 2;
                    });
                  }
                  doc.save("ProjectPlan.pdf");
                }}
                className="text-gray-700 hover:bg-gray-100"
              >
                Print Plan
              </Button>
              <div className="text-sm text-gray-600">
                Last saved:{" "}
                {ep?.["updated_at"]
                  ? new Date(String(ep["updated_at"])).toLocaleString()
                  : "\u2014"}
              </div>
            </div>
          </div>

          {/* Refined Tasks Summary - moved to sidebar */}
          {refined_tasks && refined_tasks.refinement_summary && (
            <div className="rounded-2xl p-0">
              <SidebarSummary summary={refined_tasks.refinement_summary} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
