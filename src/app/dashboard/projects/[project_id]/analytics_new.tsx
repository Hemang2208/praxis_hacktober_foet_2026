'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ProjectDashboard } from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

function ProjectAnalyticsContent() {
  const params = useParams();
  const project_id = params.project_id as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Project Analytics
          </h1>
          <p className="text-slate-600 mt-2">
            Comprehensive insights and metrics for your project powered by FastAPI backend
          </p>
        </div>
        
        <ProjectDashboard project_id={project_id} />
      </div>
    </div>
  );
}

function ProjectAnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectAnalyticsPage() {
  return (
    <Suspense fallback={<ProjectAnalyticsLoading />}>
      <ProjectAnalyticsContent />
    </Suspense>
  );
}