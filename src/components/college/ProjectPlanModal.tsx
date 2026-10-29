"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CheckSquare, Loader2 } from "lucide-react";
import { ProjectPlan } from "@/redux/slice/project.slice";

interface ProjectPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  // prefer backend-sourced plan; projectPlan kept for compatibility
  projectPlan?: ProjectPlan | null;
  // planner-agent GET result (project object) — used when projectPlan is not present
  agentProjectData?: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

export const ProjectPlanModal: React.FC<ProjectPlanModalProps> = ({
  isOpen,
  onClose,
  projectPlan,
  agentProjectData,
  loading,
  error,
}) => {
  // Raw JSON view removed; no local state required
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Plan</DialogTitle>
            <DialogDescription>
              Loading project plan details...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Plan</DialogTitle>
            <DialogDescription>
              Error loading project plan
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Determine effective plan: prefer `agentProjectData` (agent response) to avoid DB fallbacks
  const effectivePlan = (agentProjectData as Record<string, unknown> | null) || (projectPlan as unknown as Record<string, unknown> | null) || null;

  if (!effectivePlan) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Plan</DialogTitle>
            <DialogDescription>No project plan available</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-slate-600">No project plan data found.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Project Plan</DialogTitle>
          <DialogDescription>
            Comprehensive project planning and roadmap
          </DialogDescription>
        </DialogHeader>

        {/* Raw JSON view removed for cleaner UI */}

        <div className="space-y-6">
          {/* Plan Insights: derived/aggregated data for quick overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                Plan Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // derive aggregates
                const hlt = Array.isArray(effectivePlan?.['high_level_tasks']) ? (effectivePlan!['high_level_tasks'] as unknown[]) : [];
                const taskCount = hlt.length;
                let subtaskCount = 0;
                let totalEffort = 0; // approximate numeric story points
                const techSet = new Set<string>();
                const depSet = new Set<string>();

                const parseEffort = (val: unknown) => {
                  if (val == null) return 0;
                  try {
                    const s = String(val);
                    const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
                    if (m) return Number(m[1]);
                  } catch {};
                  return 0;
                };

                for (const t of hlt) {
                  const trec = (t as Record<string, unknown>);
                  const subt = Array.isArray(trec['sub_tasks']) ? (trec['sub_tasks'] as unknown[]) : [];
                  subtaskCount += subt.length;
                  // effort may be on task or sub_tasks
                  totalEffort += parseEffort(trec['effort'] ?? trec['estimated_duration'] ?? trec['estimated_effort']);
                  for (const st of subt) {
                    const srec = st as Record<string, unknown>;
                    totalEffort += parseEffort(srec['effort'] ?? srec['estimated_effort']);
                    if (Array.isArray(srec['technical_requirements'])) {
                      for (const r of srec['technical_requirements'] as unknown[]) techSet.add(String(r ?? ''));
                    }
                  }
                  if (Array.isArray(trec['technical_requirements'])) {
                    for (const r of trec['technical_requirements'] as unknown[]) techSet.add(String(r ?? ''));
                  }
                  if (Array.isArray(trec['dependencies'])) {
                    for (const d of trec['dependencies'] as unknown[]) depSet.add(String(d ?? ''));
                  }
                }

                // also include top-level technical requirements if any
                const topTech = effectivePlan?.['technical_requirements'];
                if (Array.isArray(topTech)) for (const t of topTech as unknown[]) techSet.add(String(t ?? ''));

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-slate-500">High-level tasks</div>
                      <div className="text-2xl font-semibold">{taskCount}</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-slate-500">Subtasks</div>
                      <div className="text-2xl font-semibold">{subtaskCount}</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-slate-500">Approx. effort (points)</div>
                      <div className="text-2xl font-semibold">{totalEffort}</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-sm text-slate-500">Unique tech reqs</div>
                      <div className="text-2xl font-semibold">{techSet.size}</div>
                    </div>
                    {depSet.size > 0 && (
                      <div className="md:col-span-4 mt-2">
                        <p className="text-sm text-slate-500">Dependencies</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[...depSet].map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          {/* Project Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-sky-600" />
                Project Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {String(effectivePlan['summary'] ?? '')}
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span>Created: {effectivePlan['created_at'] ? new Date(String(effectivePlan['created_at'])).toLocaleDateString() : '\u2014'}</span>
                <span>Updated: {effectivePlan['updated_at'] ? new Date(String(effectivePlan['updated_at'])).toLocaleDateString() : '\u2014'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Key Features & Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                Key Features & Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                  {(Array.isArray(effectivePlan['key_features_deliverables']) ? (effectivePlan['key_features_deliverables'] as unknown[]) : []).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{String(feature ?? '')}</p>
                    </div>
                  ))}
                </div>
            </CardContent>
          </Card>

          {/* Major Milestones removed to simplify the plan view */}

          {/* High-Level Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-sky-600" />
                High-Level Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                  {(Array.isArray(effectivePlan['high_level_tasks']) ? (effectivePlan['high_level_tasks'] as unknown[]) : []).map((task, index) => {
                    const t = (task as unknown) as Record<string, unknown>;
                    const sub_tasks = Array.isArray(t['sub_tasks']) ? (t['sub_tasks'] as unknown[]) : [];
                    const dependencies = Array.isArray(t['dependencies']) ? (t['dependencies'] as unknown[]) : [];
                    const effort = t['effort'] || t['estimated_effort'] || t['estimated_duration'] || '';
                    const techReqs = Array.isArray(t['technical_requirements']) ? (t['technical_requirements'] as unknown[]) : [];

                    return (
                      <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            {String(t['task_name'] ?? t['name'] ?? t['title'] ?? '')}
                          </h4>
                          <Badge variant="secondary" className="ml-2">
                            {String(effort ?? '')}
                          </Badge>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-3">
                          {String(t['description'] ?? t['details'] ?? '')}
                        </p>

                        {techReqs.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Technical requirements:</p>
                            <div className="flex flex-wrap gap-2">
                              {techReqs.map((req, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-slate-50 text-slate-800 border-slate-200">
                                  {String(req ?? '')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {sub_tasks.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subtasks</p>
                            <div className="space-y-2">
                              {sub_tasks.map((st, sidx) => {
                                const srec = (st as unknown) as Record<string, unknown>;
                                const sEffort = srec['effort'] || srec['estimated_effort'] || '';
                                const sTech = Array.isArray(srec['technical_requirements']) ? (srec['technical_requirements'] as unknown[]) : [];
                                return (
                                  <div key={sidx} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium text-slate-900 dark:text-slate-100">{String(srec['name'] ?? srec['title'] ?? '')}</div>
                                      <div className="text-xs text-slate-500">{String(sEffort ?? '')}</div>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{String(srec['description'] ?? '')}</div>
                                    {sTech.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {sTech.map((tr, ti) => (
                                          <Badge key={ti} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {String(tr ?? '')}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Render every name/title/task_name found (task + sub_tasks) as compact blocks */}
                        {(() => {
                          const nameSet = new Set<string>();

                          const add = (val: unknown) => {
                            if (val == null) return;
                            const s = String(val).trim();
                            if (!s) return;
                            nameSet.add(s);
                          };

                          const traverse = (node: unknown) => {
                            if (node == null) return;
                            if (typeof node === 'string' || typeof node === 'number') {
                              add(node);
                              return;
                            }
                            if (Array.isArray(node)) {
                              for (const it of node) traverse(it);
                              return;
                            }
                            if (typeof node === 'object') {
                              const obj = node as Record<string, unknown>;
                              // common name keys
                              add(obj['name'] ?? obj['title'] ?? obj['task_name'] ?? obj['label'] ?? obj['summary']);
                              // technical requirements may be objects or strings
                              if (Array.isArray(obj['technical_requirements'])) traverse(obj['technical_requirements']);
                              // dependencies may be objects or strings
                              if (Array.isArray(obj['dependencies'])) traverse(obj['dependencies']);
                              // sub_tasks or sub_tasks
                              if (Array.isArray(obj['sub_tasks'])) traverse(obj['sub_tasks']);
                              if (Array.isArray(obj['sub_tasks'])) traverse(obj['sub_tasks']);

                              // also traverse all values to catch nested name fields
                              for (const v of Object.values(obj)) traverse(v);
                            }
                          };

                          // start from the high-level task and its nested fields
                          traverse(t);

                          const nameBlocks = Array.from(nameSet.values());
                          if (nameBlocks.length === 0) return null;

                          return (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">All Names</p>
                              <div className="flex flex-wrap gap-2">
                                {nameBlocks.map((n, ni) => (
                                  <div key={ni} className="px-3 py-1 rounded bg-gray-100 dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200 border border-gray-200">
                                    {n}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {dependencies.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dependencies:</p>
                            <div className="flex flex-wrap gap-2">
                              {dependencies.map((dependency, depIndex) => (
                                <Badge key={depIndex} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  {String(dependency ?? '')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
          </Card>
        </div>

        {/* Raw JSON hidden by design */}
      </DialogContent>
    </Dialog>
  );
};