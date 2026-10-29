"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { jobListings } from "@/components/jobListings";
import type { JobListing } from "@/components/jobListings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  MapPin,
  Users,
  Home,
  Send,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();

  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;

  const job: JobListing | undefined = jobListings.find(
    (job) => job.id === jobId,
  );

  useEffect(() => {
    if (!job || !job.isOpen) {
      router.replace("/careers");
    }
  }, [job, router]);

  if (!job) return null;
  const isJobOpen = job.isOpen;

  const getDepartmentBadgeColor = (department: string) => {
    switch (department.toLowerCase()) {
      case "marketing":
        return "bg-pink-100 text-pink-800";
      case "creative":
        return "bg-purple-100 text-purple-800";
      case "growth":
        return "bg-green-100 text-green-800";
      case "design":
        return "bg-blue-100 text-blue-800";
      case "tech innovation":
        return "bg-orange-100 text-orange-800";
      case "engineering":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDepartmentIconColor = (department: string) => {
    switch (department.toLowerCase()) {
      case "marketing":
        return "text-pink-600";
      case "creative":
        return "text-fuchsia-600";
      case "growth":
        return "text-green-600";
      case "design":
        return "text-sky-600";
      case "tech innovation":
        return "text-orange-600";
      case "engineering":
        return "text-red-600";
      default:
        return "text-slate-600";
    }
  };

  const getWorkTypeIcon = (workType: string) => {
    switch (workType.toLowerCase()) {
      case "remote":
        return <Home className="h-4 w-4 text-sky-600" />;
      case "hybrid":
        return <Users className="h-4 w-4 text-violet-600" />;
      case "on-site":
        return <MapPin className="h-4 w-4 text-emerald-600" />;
      default:
        return <Briefcase className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className="mx-auto min-h-screen bg-background">
      <div className="mx-auto container py-12">
        <div className="max-w-4xl mx-auto mt-20">
          <div className="mb-8">
            <Link
              href="/careers"
              className="text-primary hover:underline flex items-center"
            >
              ← Back to all positions
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 md:p-8 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getDepartmentBadgeColor(job.department)}>
                      {job.department}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground border-primary/30 bg-primary/10"
                    >
                      {getWorkTypeIcon(job.workType)}
                      <span className="ml-1">{job.workType}</span>
                    </Badge>
                    {/* {job.pay && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-primary/30 bg-primary/10"
                      >
                        <IndianRupee
                          className={`h-3 w-3 mr-1 ${getDepartmentIconColor(
                            job.department,
                          )}`}
                        />
                        {job.pay}
                      </Badge>
                    )} */}
                    <Badge
                      variant="outline"
                      className="text-muted-foreground border-primary/30 bg-primary/10"
                    >
                      <MapPin className="h-3 w-3 mr-1 text-rose-600" />
                      {job.location}
                    </Badge>
                  </div>
                </div>
                {isJobOpen ? (
                  <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 w-full md:w-auto"
                  >
                    <Link href={`/careers/apply?position=${job.title}`}>
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full md:w-auto" disabled>
                    Opening Soon
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Job Description</h2>
                <p className="text-muted-foreground">{job.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Responsibilities
                  </h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((resp, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {job.perks?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Perks & Benefits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.perks.map((perk, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-primary border-primary/30 bg-primary/10"
                      >
                        {perk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full">
                {isJobOpen ? (
                  <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 w-full sm:flex-1"
                  >
                    <Link href={`/careers/apply?position=${job.title}`}>
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full sm:flex-1" disabled>
                    Opening Soon
                  </Button>
                )}
                <Button variant="outline" className="w-full sm:flex-1" asChild>
                  <Link href="/careers">
                    <Briefcase className="h-4 w-4 mr-2" />
                    View other openings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
