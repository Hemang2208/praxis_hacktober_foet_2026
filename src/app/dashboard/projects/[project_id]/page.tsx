// Server Component - handles route configuration and wraps client component
// Force dynamic rendering - prevent static optimization and ISR
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ProjectDetailClient from "./ProjectDetailClient";

// This is a Server Component that ensures fresh data fetching
export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}