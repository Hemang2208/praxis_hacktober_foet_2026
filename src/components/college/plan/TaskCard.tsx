import React from 'react';
// intentionally minimal imports; UI badges replaced with inline chips
import { Clock, Settings } from 'lucide-react';

type Subtask = {
  name: string;
  description?: string;
  estimated_duration?: string;
};

type RefinedTask = {
  task_name: string;
  description?: string;
  priority?: string;
  complexity?: string;
  estimated_duration?: string;
  skills_required?: string[];
  acceptance_criteria?: string[];
  sub_tasks?: Subtask[];
  dependencies?: string[];
};

export default function TaskCard({ task }: { task: RefinedTask }) {
  const isProjectSetup = typeof task.task_name === 'string' && /project setup/i.test(task.task_name);
  return (
    <article className={
      isProjectSetup
        ? "relative overflow-hidden rounded-2xl p-4 bg-white text-black shadow-sm border border-gray-300"
        : "relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-white/60 via-blue-50/40 to-white/40 backdrop-blur-md shadow-lg hover:scale-[1.01] transition-transform"
    }>
      {isProjectSetup && (
        <div className="absolute -top-3 -left-3 rotate-12 bg-black text-white px-3 py-0.5 rounded shadow-sm text-xs font-semibold flex items-center gap-2">
          <Settings className="w-3 h-3" />
          <span>SETUP</span>
        </div>
      )}
      {!isProjectSetup && <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 opacity-20 blur-3xl" />}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={isProjectSetup ? "text-xl font-semibold tracking-tight text-black" : "text-xl font-extrabold tracking-tight text-slate-900"}>{task.task_name}</h3>
            {task.description && (
              <p className={isProjectSetup ? "text-sm text-gray-700 mt-2" : "text-sm text-slate-700 mt-2"}>{task.description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 text-sm">
            {task.priority && (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isProjectSetup ? (task.priority === 'high' ? 'bg-black text-white' : task.priority === 'medium' ? 'bg-gray-200 text-black' : 'bg-gray-800 text-white') : (task.priority === 'high' ? 'bg-red-600 text-white' : task.priority === 'medium' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white')}`}>
                {task.priority.toUpperCase()}
              </span>
            )}

            {task.complexity && (
              <span className={isProjectSetup ? "text-xs text-gray-300" : "text-xs text-slate-600"}>{task.complexity} complexity</span>
            )}

            {task.estimated_duration && (
              <span className={`inline-flex items-center gap-2 text-xs ${isProjectSetup ? 'text-gray-300' : 'text-slate-600'}`}>
                <Clock className={isProjectSetup ? 'w-4 h-4 text-gray-300' : 'w-4 h-4 text-slate-500'} /> {task.estimated_duration}
              </span>
            )}
          </div>
        </div>

  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {task.skills_required && task.skills_required.length > 0 && (
            <div>
              <h4 className={isProjectSetup ? "text-sm font-semibold text-black mb-2" : "text-sm font-semibold text-slate-700 mb-2"}>Skills</h4>
              <div className="flex flex-wrap gap-2">
                {task.skills_required.map((skill, i) => (
                  <span key={i} className={isProjectSetup ? "text-xs px-2 py-1 rounded-full bg-gray-50 text-black border border-gray-200" : "text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-800"}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
            <div>
              <h4 className={isProjectSetup ? "text-sm font-semibold text-black mb-2" : "text-sm font-semibold text-slate-700 mb-2"}>Acceptance</h4>
              <ul className={isProjectSetup ? "list-inside space-y-1 text-sm text-gray-700" : "list-inside space-y-1 text-sm text-slate-700"}>
                {task.acceptance_criteria.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {task.sub_tasks && task.sub_tasks.length > 0 && (
          <div className="mt-2">
              <h4 className={isProjectSetup ? "text-sm font-semibold text-black mb-2" : "text-sm font-semibold text-slate-700 mb-2"}>Subtasks</h4>
            <div className="space-y-2">
              {task.sub_tasks.map((subtask, i) => (
                <div key={i} className={isProjectSetup ? "flex items-center justify-between gap-4 bg-gray-50 rounded-lg p-3 border border-gray-100" : "flex items-center justify-between gap-4 bg-white/50 rounded-lg p-3"}>
                  <div>
                    <div className={isProjectSetup ? "font-medium text-sm text-black" : "font-medium text-sm"}>{subtask.name}</div>
                    {subtask.description && <div className={isProjectSetup ? "text-xs text-gray-700 mt-1" : "text-xs text-slate-600 mt-1"}>{subtask.description}</div>}
                  </div>
                  {subtask.estimated_duration && <div className={isProjectSetup ? "text-xs text-gray-700" : "text-xs text-slate-600"}>{subtask.estimated_duration}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {task.dependencies && task.dependencies.length > 0 && (
          <div className="mt-2">
            <h4 className={isProjectSetup ? "text-sm font-semibold text-black mb-2" : "text-sm font-semibold text-slate-700 mb-2"}>Depends on</h4>
            <div className="flex flex-wrap gap-2">
              {task.dependencies.map((d, i) => (
                <span key={i} className={isProjectSetup ? "text-xs px-2 py-1 rounded bg-gray-100 text-black" : "text-xs px-2 py-1 rounded bg-slate-100"}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
