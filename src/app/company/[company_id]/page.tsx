"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Globe,
  Linkedin,
  MapPin,
  Users,
  Briefcase,
  ArrowLeft,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import TeamManagementPanel from "@/components/company/TeamManagementPanel";
// import CompanyDashboard from "@/components/company/CompanyDashboard";
import { CompanyProfileSkeleton } from "@/components/ui/assessment-skeleton";
import { CompanySubrole, normalizeCompanySubrole } from "@/lib/company-rbac";

interface CompanyPublic {
  _id: string;
  companyName: string;
  industry: string;
  companyDescription: string;
  companySize: string;
  headquartersLocation: string;
  officialWebsite: string;
  linkedinProfile: string;
  image_url: string;
  hiringRolesOffered: string[];
  internshipAvailable: boolean;
  contactPersonName: string;
  memberCount: number;
}

interface ViewerMembership {
  email: string;
  subrole: CompanySubrole;
  status: "invited" | "active";
}

export default function CompanyPublicPage() {
  const params = useParams();
  const companyId = params.company_id as string;

  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [viewerMembership, setViewerMembership] =
    useState<ViewerMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/company/${companyId}/public`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            data?.error ||
            data?.message ||
            `Failed to load company page (${res.status})`;
          throw new Error(msg);
        }
        return data;
      })
      .then((data) => {
        if (!data || data.error) {
          setError(data?.error || "Failed to load company page.");
        } else {
          setCompany(data.company);
          setViewerMembership(data.viewerMembership);
        }
      })
      .catch((err) => setError(err?.message || "Failed to load company page."))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <CompanyProfileSkeleton />;
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          {error || "Company not found."}
        </p>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>
    );
  }

  const isAdmin =
    viewerMembership &&
    viewerMembership.status === "active" &&
    ["owner", "admin"].includes(
      normalizeCompanySubrole(viewerMembership.subrole),
    );
  const canManageTeam =
    viewerMembership &&
    viewerMembership.status === "active" &&
    ["owner", "admin"].includes(
      normalizeCompanySubrole(viewerMembership.subrole),
    );

  const subroleLabel = viewerMembership?.subrole
    ? normalizeCompanySubrole(viewerMembership.subrole)
        .charAt(0)
        .toUpperCase() +
      normalizeCompanySubrole(viewerMembership.subrole).slice(1)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {viewerMembership && (
            <Badge variant="secondary" className="capitalize">
              {subroleLabel}
            </Badge>
          )}
          {isAdmin && (
            <Button size="sm" asChild>
              <Link href="/dashboard">
                <Settings className="h-4 w-4 mr-2" />
                Manage in Dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canManageTeam && viewerMembership && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamManagementPanel
              companyId={companyId}
              myEmail={viewerMembership.email}
              mySubrole={viewerMembership.subrole}
            />
          </CardContent>
        </Card>
      )}

      {/* Company Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
              {company.image_url ? (
                <Image
                  src={company.image_url}
                  alt={company.companyName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {company.companyName}
              </h1>
              <p className="text-muted-foreground mt-1">{company.industry}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {company.headquartersLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {company.headquartersLocation}
                  </span>
                )}
                {company.companySize && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {company.companySize} employees
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {company.memberCount} team member
                  {company.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
              {/* Links */}
              <div className="flex items-center gap-3 mt-3">
                {company.officialWebsite && (
                  <a
                    href={company.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {company.linkedinProfile && (
                  <a
                    href={company.linkedinProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      {company.companyDescription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {company.companyDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hiring & Internships */}
      {(company.hiringRolesOffered.length > 0 ||
        company.internshipAvailable) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.internshipAvailable && (
              <div>
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Internships Available
                </Badge>
              </div>
            )}
            {company.hiringRolesOffered.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Hiring for:</p>
                <div className="flex flex-wrap gap-2">
                  {company.hiringRolesOffered.map((role, idx) => (
                    <Badge key={idx} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      {company.contactPersonName && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Contact person:{" "}
              <span className="font-medium text-foreground">
                {company.contactPersonName}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analytics */}
      {/* <CompanyDashboard
        companyId={companyId}
        companyName={company.companyName}
        viewerMembership={viewerMembership}
      /> */}

      <Separator className="my-6" />
      <p className="text-center text-xs text-muted-foreground">
        Company page powered by Kiyo
      </p>
    </div>
  );
}
