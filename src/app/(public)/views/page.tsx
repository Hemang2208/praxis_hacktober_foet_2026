"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, X, RefreshCw, Download } from "lucide-react";
import {
  APPLICATION_STATUSES,
  CONTACT_STATUSES,
  formatStatusLabel,
  type ApplicationStatus,
  type ContactStatus,
  type ViewEntityType,
} from "@/lib/view-status";

interface JobApplication {
  _id: string;
  full_name: string;
  position: string;
  expectedPackage?: string;
  area: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  information: {
    position: string;
    experienceLevel: string;
    yearsOfExperience: string;
    expectedPackage?: string;
    currentEmploymentStatus?: string;
    noticePeriod?: string;
  };
  links: {
    resumeURL: string;
    linkedinURL: string;
    githubURL?: string;
    portfolioURL?: string;
    showcaseURL?: string;
  };
  job: {
    skills: string[];
    coverLetter: string;
    achievements?: string;
    message?: string;
  };
  status: ApplicationStatus;
  created_at: string;
}

interface InternApplication {
  _id: string;
  full_name: string;
  college: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  information: {
    experience?: string;
    message: string;
  };
  links: {
    linkedin: string;
    resumeLink: string;
    portfolioLink?: string;
  };
  status: ApplicationStatus;
  created_at: string;
}

interface ContactSubmission {
  _id: string;
  full_name: string;
  email: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

interface ApplicationsData {
  jobApplications: JobApplication[];
  internApplications: InternApplication[];
  contacts: ContactSubmission[];
  totalJobs: number;
  totalInterns: number;
  totalContacts: number;
  total: number;
}

function getStatusColor(status: ApplicationStatus | ContactStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 border-amber-300 text-amber-900";
    case "REVIEWING":
      return "bg-blue-50 border-blue-300 text-blue-900";
    case "NOT_FIT":
      return "bg-rose-50 border-rose-300 text-rose-900";
    case "PARTIALLY_FIT":
      return "bg-orange-50 border-orange-300 text-orange-900";
    case "GOOD_FIT":
      return "bg-emerald-50 border-emerald-300 text-emerald-900";
    case "SELECTED":
      return "bg-green-50 border-green-400 text-green-900";
    case "REJECTED":
      return "bg-red-50 border-red-400 text-red-900";
    case "READ":
      return "bg-cyan-50 border-cyan-300 text-cyan-900";
    case "REPLIED":
      return "bg-indigo-50 border-indigo-300 text-indigo-900";
    case "CLOSED":
      return "bg-slate-100 border-slate-300 text-slate-800";
    case "SPAM":
      return "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-900";
    default:
      return "bg-gray-50 border-gray-300 text-gray-800";
  }
}

function ViewsPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ApplicationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [search_query, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(
    null,
  );
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});

  // Separate filters for each tab
  const [jobFilters, setJobFilters] = useState({
    position: "",
    area: "",
    experienceLevel: "",
    status: "" as "" | ApplicationStatus,
  });

  const [internFilters, setInternFilters] = useState({
    college: "",
    status: "" as "" | ApplicationStatus,
  });

  const [contactFilters, setContactFilters] = useState({
    email: "",
    status: "" as "" | ContactStatus,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search_query);
    }, 300);

    return () => clearTimeout(timer);
  }, [search_query]);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        setAuthChecking(true);
        const pass = searchParams.get("pass");

        if (!pass) {
          setIsAuthorized(false);
          return;
        }

        const response = await fetch("/api/views/applications", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: pass }),
        });

        const result = await response.json();

        setIsAuthorized(
          Boolean(response.ok && result?.success && result?.authorized),
        );
      } catch {
        setIsAuthorized(false);
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAccess();
  }, [searchParams]);

  useEffect(() => {
    if (!authChecking && isAuthorized) {
      fetchApplications();
    }
  }, [authChecking, isAuthorized]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/views/applications");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch applications");
      }
    } catch (err) {
      setError("An error occurred while fetching applications");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateEntityStatus = useCallback(
    async (
      entityType: ViewEntityType,
      id: string,
      status: ApplicationStatus | ContactStatus,
    ) => {
      if (!data) return;

      setStatusUpdateError(null);
      const key = `${entityType}:${id}`;
      const previousData = data;

      const optimisticData: ApplicationsData = {
        ...previousData,
        jobApplications:
          entityType === "job"
            ? previousData.jobApplications.map((app) =>
                app._id === id
                  ? { ...app, status: status as ApplicationStatus }
                  : app,
              )
            : previousData.jobApplications,
        internApplications:
          entityType === "intern"
            ? previousData.internApplications.map((app) =>
                app._id === id
                  ? { ...app, status: status as ApplicationStatus }
                  : app,
              )
            : previousData.internApplications,
        contacts:
          entityType === "contact"
            ? previousData.contacts.map((contact) =>
                contact._id === id
                  ? { ...contact, status: status as ContactStatus }
                  : contact,
              )
            : previousData.contacts,
      };

      setData(optimisticData);
      setUpdatingKeys((prev) => ({ ...prev, [key]: true }));

      try {
        const response = await fetch("/api/views/applications", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, entityType, status }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setData(previousData);
          setStatusUpdateError(result.error || "Failed to update status");
        }
      } catch (err) {
        console.error("Status update failed", err);
        setData(previousData);
        setStatusUpdateError("Failed to update status");
      } finally {
        setUpdatingKeys((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    [data],
  );

  // Filter applications based on search and filter criteria
  const filteredData = useMemo(() => {
    if (!data) return null;

    // Start with original data
    let jobs = [...data.jobApplications];
    let interns = [...data.internApplications];
    let contacts = [...data.contacts];

    // Apply search filter (applies to all types)
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();

      jobs = jobs.filter(
        (app) =>
          app.full_name.toLowerCase().includes(query) ||
          app.position.toLowerCase().includes(query) ||
          app.area.toLowerCase().includes(query) ||
          app.contactInfo.email.toLowerCase().includes(query),
      );

      interns = interns.filter(
        (app) =>
          app.full_name.toLowerCase().includes(query) ||
          app.college.toLowerCase().includes(query) ||
          app.contactInfo.email.toLowerCase().includes(query),
      );

      contacts = contacts.filter(
        (contact) =>
          contact.full_name.toLowerCase().includes(query) ||
          contact.email.toLowerCase().includes(query),
      );
    }

    // Apply JOB specific filters
    if (jobFilters.position && jobFilters.position.trim() !== "") {
      const query = jobFilters.position.toLowerCase().trim();
      jobs = jobs.filter((app) => app.position.toLowerCase().includes(query));
    }

    if (jobFilters.area && jobFilters.area.trim() !== "") {
      const query = jobFilters.area.toLowerCase().trim();
      jobs = jobs.filter((app) => app.area.toLowerCase().includes(query));
    }

    if (
      jobFilters.experienceLevel &&
      jobFilters.experienceLevel.trim() !== ""
    ) {
      const query = jobFilters.experienceLevel.toLowerCase().trim();
      jobs = jobs.filter((app) =>
        app.information.experienceLevel.toLowerCase().includes(query),
      );
    }

    if (jobFilters.status) {
      jobs = jobs.filter(
        (app) => (app.status || "PENDING") === jobFilters.status,
      );
    }

    // Apply INTERN specific filters
    if (internFilters.college && internFilters.college.trim() !== "") {
      const query = internFilters.college.toLowerCase().trim();
      interns = interns.filter((app) =>
        app.college.toLowerCase().includes(query),
      );
    }

    if (internFilters.status) {
      interns = interns.filter(
        (app) => (app.status || "PENDING") === internFilters.status,
      );
    }

    // Apply CONTACT specific filters
    if (contactFilters.email && contactFilters.email.trim() !== "") {
      const query = contactFilters.email.toLowerCase().trim();
      contacts = contacts.filter((contact) =>
        contact.email.toLowerCase().includes(query),
      );
    }

    if (contactFilters.status) {
      contacts = contacts.filter(
        (contact) => (contact.status || "PENDING") === contactFilters.status,
      );
    }

    return {
      jobApplications: jobs,
      internApplications: interns,
      contacts: contacts,
      totalJobs: jobs.length,
      totalInterns: interns.length,
      totalContacts: contacts.length,
      total: jobs.length + interns.length + contacts.length,
    };
  }, [data, debouncedSearch, jobFilters, internFilters, contactFilters]);

  const csvRows = useMemo(() => {
    if (!filteredData) return [];

    const mapJob = (app: JobApplication) => ({
      category: "Job",
      name: app.full_name,
      email: app.contactInfo.email,
      status: formatStatusLabel(app.status || "PENDING"),
      created_at: app.created_at,
    });

    const mapIntern = (app: InternApplication) => ({
      category: "Intern",
      name: app.full_name,
      email: app.contactInfo.email,
      status: formatStatusLabel(app.status || "PENDING"),
      created_at: app.created_at,
    });

    const mapContact = (contact: ContactSubmission) => ({
      category: "Contact",
      name: contact.full_name,
      email: contact.email,
      status: formatStatusLabel(contact.status || "PENDING"),
      created_at: contact.created_at,
    });

    if (activeTab === "jobs") return filteredData.jobApplications.map(mapJob);

    if (activeTab === "interns")
      return filteredData.internApplications.map(mapIntern);

    if (activeTab === "contacts") return filteredData.contacts.map(mapContact);

    return [
      ...filteredData.jobApplications.map(mapJob),
      ...filteredData.internApplications.map(mapIntern),
      ...filteredData.contacts.map(mapContact),
    ];
  }, [filteredData, activeTab]);

  const downloadCsv = useCallback(() => {
    if (csvRows.length === 0) return;

    const headers = ["Category", "Name", "Email", "Status", "Applied At"];

    const formatCsvDate = (value: string) =>
      new Date(value).toLocaleString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    const escapeCsvValue = (value: string) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = csvRows.map((row) =>
      [
        row.category,
        row.name,
        row.email,
        row.status,
        formatCsvDate(row.created_at),
      ]
        .map(escapeCsvValue)
        .join(","),
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const selectedTabLabel =
      activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    const fileName = `Kiyo_${selectedTabLabel}_File.csv`;

    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", fileName);

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [csvRows, activeTab]);

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Invalid or missing access key. Open this page with a valid
              password query param in the URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden mt-16 sm:mt-20">
      <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            All Applications
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Total Applications: {filteredData?.total || 0} (Jobs:{" "}
            {filteredData?.totalJobs || 0}, Internships:{" "}
            {filteredData?.totalInterns || 0}, Contacts:{" "}
            {filteredData?.totalContacts || 0})
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 sm:items-center">
            {/* Search Bar */}
            <div className="flex-1 relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search name, position, area..."
                value={search_query}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              />
              {search_query && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            <button
              onClick={downloadCsv}
              disabled={
                loading || authChecking || !isAuthorized || csvRows.length === 0
              }
              className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 sm:active:bg-gray-50 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Download CSV"
              title="Download CSV"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Download</span>
            </button>

            <button
              onClick={() => {
                if (!authChecking && isAuthorized) {
                  void fetchApplications();
                }
              }}
              disabled={loading || authChecking || !isAuthorized}
              className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 sm:active:bg-gray-50 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Refresh applications"
              title="Refresh applications"
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            {/* Filters Button */}
            <div className="relative w-full sm:w-auto">
              {activeTab !== "all" && (
                <>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 sm:active:bg-gray-50 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Filters</span>
                    {(activeTab === "jobs" &&
                      (jobFilters.position ||
                        jobFilters.area ||
                        jobFilters.experienceLevel ||
                        jobFilters.status)) ||
                    (activeTab === "interns" &&
                      (internFilters.college || internFilters.status)) ||
                    (activeTab === "contacts" &&
                      (contactFilters.email || contactFilters.status)) ? (
                      <span className="w-2 h-2 bg-blue-500 rounded-full ml-1"></span>
                    ) : null}
                  </button>

                  {/* Filter Backdrop - Mobile Only */}
                  {showFilters && (
                    <div
                      className="fixed inset-0 bg-black/40 sm:hidden z-40 animate-fadeIn"
                      onClick={() => setShowFilters(false)}
                      aria-label="Close filters"
                    />
                  )}

                  {/* Filter Dropdown/Modal */}
                  {showFilters && (
                    <div className="fixed left-0 right-0 bottom-0 sm:fixed sm:left-auto sm:right-15 sm:bottom-auto sm:top-65 sm:w-96 z-[200] animate-slideUp sm:animate-slideDown">
                      {/* Mobile: Full screen, Desktop: Dropdown */}
                      <div className="bg-white rounded-t-2xl sm:rounded-lg border border-gray-300 shadow-2xl sm:shadow-2xl max-h-[85vh] sm:max-h-[550px] overflow-y-auto">
                        <div className="p-4 sm:p-6">
                          {/* Mobile Header with Handle */}
                          <div className="sm:hidden mb-4">
                            <div className="flex flex-col items-center mb-4">
                              <div className="w-12 h-1 bg-gray-300 rounded-full mb-3"></div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Filters
                              </h3>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* JOB TAB FILTERS */}
                            {activeTab === "jobs" && (
                              <>
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Position
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Developer, Manager..."
                                    value={jobFilters.position}
                                    onChange={(e) =>
                                      setJobFilters({
                                        ...jobFilters,
                                        position: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Area/Location
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., New York, Remote..."
                                    value={jobFilters.area}
                                    onChange={(e) =>
                                      setJobFilters({
                                        ...jobFilters,
                                        area: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all"
                                  />
                                </div>

                                {/* <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Experience Level
                                  </label>
                                  <select
                                    value={jobFilters.experienceLevel}
                                    onChange={(e) =>
                                      setJobFilters({
                                        ...jobFilters,
                                        experienceLevel: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all bg-white cursor-pointer"
                                  >
                                    <option value="">All Levels</option>
                                    <option value="Fresher">Entry</option>
                                    <option value="Intermediate">
                                      Mid Level
                                    </option>
                                    <option value="Senior">Senior Level</option>
                                    <option value="Expert">Executive</option>
                                  </select>
                                </div> */}

                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Status
                                  </label>
                                  <select
                                    value={jobFilters.status}
                                    onChange={(e) =>
                                      setJobFilters({
                                        ...jobFilters,
                                        status: e.target.value as
                                          | ""
                                          | ApplicationStatus,
                                      })
                                    }
                                    aria-label="Job status filter"
                                    title="Job status filter"
                                    className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all bg-white cursor-pointer"
                                  >
                                    <option value="">All Statuses</option>
                                    {APPLICATION_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {formatStatusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {/* INTERN TAB FILTERS */}
                            {activeTab === "interns" && (
                              <>
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    College
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., MIT, Stanford..."
                                    value={internFilters.college}
                                    onChange={(e) =>
                                      setInternFilters({
                                        ...internFilters,
                                        college: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Status
                                  </label>
                                  <select
                                    value={internFilters.status}
                                    onChange={(e) =>
                                      setInternFilters({
                                        ...internFilters,
                                        status: e.target.value as
                                          | ""
                                          | ApplicationStatus,
                                      })
                                    }
                                    aria-label="Intern status filter"
                                    title="Intern status filter"
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all bg-white cursor-pointer"
                                  >
                                    <option value="">All Statuses</option>
                                    {APPLICATION_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {formatStatusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {/* CONTACT TAB FILTERS */}
                            {activeTab === "contacts" && (
                              <>
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Email
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., gmail, company.com..."
                                    value={contactFilters.email}
                                    onChange={(e) =>
                                      setContactFilters({
                                        ...contactFilters,
                                        email: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                                    Status
                                  </label>
                                  <select
                                    value={contactFilters.status}
                                    onChange={(e) =>
                                      setContactFilters({
                                        ...contactFilters,
                                        status: e.target.value as
                                          | ""
                                          | ContactStatus,
                                      })
                                    }
                                    aria-label="Contact status filter"
                                    title="Contact status filter"
                                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all bg-white cursor-pointer"
                                  >
                                    <option value="">All Statuses</option>
                                    {CONTACT_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {formatStatusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {/* Active Filters Display */}
                            {(activeTab === "jobs" &&
                              (jobFilters.position ||
                                jobFilters.area ||
                                jobFilters.experienceLevel ||
                                jobFilters.status)) ||
                            (activeTab === "interns" &&
                              (internFilters.college ||
                                internFilters.status)) ||
                            (activeTab === "contacts" &&
                              (contactFilters.email ||
                                contactFilters.status)) ? (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-xs font-medium text-blue-800 mb-3">
                                  Active Filters:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {activeTab === "jobs" &&
                                    jobFilters.position && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        Position:{" "}
                                        {jobFilters.position.substring(0, 15)}
                                        {jobFilters.position.length > 15
                                          ? "..."
                                          : ""}
                                      </span>
                                    )}
                                  {activeTab === "jobs" && jobFilters.area && (
                                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                      Area: {jobFilters.area.substring(0, 15)}
                                      {jobFilters.area.length > 15 ? "..." : ""}
                                    </span>
                                  )}
                                  {activeTab === "jobs" &&
                                    jobFilters.experienceLevel && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        {jobFilters.experienceLevel}
                                      </span>
                                    )}
                                  {activeTab === "jobs" &&
                                    jobFilters.status && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        Status:{" "}
                                        {formatStatusLabel(jobFilters.status)}
                                      </span>
                                    )}
                                  {activeTab === "interns" &&
                                    internFilters.college && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        College:{" "}
                                        {internFilters.college.substring(0, 15)}
                                        {internFilters.college.length > 15
                                          ? "..."
                                          : ""}
                                      </span>
                                    )}
                                  {activeTab === "interns" &&
                                    internFilters.status && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        Status:{" "}
                                        {formatStatusLabel(
                                          internFilters.status,
                                        )}
                                      </span>
                                    )}
                                  {activeTab === "contacts" &&
                                    contactFilters.email && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        Email:{" "}
                                        {contactFilters.email.substring(0, 15)}
                                        {contactFilters.email.length > 15
                                          ? "..."
                                          : ""}
                                      </span>
                                    )}
                                  {activeTab === "contacts" &&
                                    contactFilters.status && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                                        Status:{" "}
                                        {formatStatusLabel(
                                          contactFilters.status,
                                        )}
                                      </span>
                                    )}
                                </div>
                              </div>
                            ) : null}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                              <button
                                onClick={() => {
                                  if (activeTab === "jobs") {
                                    setJobFilters({
                                      position: "",
                                      area: "",
                                      experienceLevel: "",
                                      status: "",
                                    });
                                  } else if (activeTab === "interns") {
                                    setInternFilters({
                                      college: "",
                                      status: "",
                                    });
                                  } else if (activeTab === "contacts") {
                                    setContactFilters({
                                      email: "",
                                      status: "",
                                    });
                                  }
                                }}
                                className="cursor-pointer flex-1 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 sm:active:bg-gray-50 transition-all duration-200"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => setShowFilters(false)}
                                className="cursor-pointer flex-1 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-black rounded-lg hover:bg-gray-900 active:bg-black sm:active:bg-gray-900 transition-all duration-200 shadow-sm"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <style jsx>{`
                @keyframes slideUp {
                  from {
                    transform: translateY(100%);
                    opacity: 0;
                  }
                  to {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
                @keyframes slideDown {
                  from {
                    transform: translateY(-10px);
                    opacity: 0;
                  }
                  to {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
                .animate-slideUp {
                  animation: slideUp 0.3s ease-out;
                }
                .animate-slideDown {
                  animation: slideDown 0.2s ease-out;
                }
                .animate-fadeIn {
                  animation: fadeIn 0.2s ease-out;
                }
              `}</style>
            </div>
          </div>
        </div>

        {/* Debug Filter Info */}
        {((activeTab === "jobs" &&
          (jobFilters.position ||
            jobFilters.area ||
            jobFilters.experienceLevel ||
            jobFilters.status)) ||
          (activeTab === "interns" &&
            (internFilters.college || internFilters.status)) ||
          (activeTab === "contacts" &&
            (contactFilters.email || contactFilters.status))) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>Active Filters:</strong>
            {activeTab === "jobs" && jobFilters.position && (
              <span> Position: "{jobFilters.position}"</span>
            )}
            {activeTab === "jobs" && jobFilters.area && (
              <span> | Area: "{jobFilters.area}"</span>
            )}
            {activeTab === "jobs" && jobFilters.experienceLevel && (
              <span> | Experience: "{jobFilters.experienceLevel}"</span>
            )}
            {activeTab === "jobs" && jobFilters.status && (
              <span> | Status: "{formatStatusLabel(jobFilters.status)}"</span>
            )}
            {activeTab === "interns" && internFilters.college && (
              <span> | College: "{internFilters.college}"</span>
            )}
            {activeTab === "interns" && internFilters.status && (
              <span>
                {" "}
                | Status: "{formatStatusLabel(internFilters.status)}"
              </span>
            )}
            {activeTab === "contacts" && contactFilters.email && (
              <span> | Email: "{contactFilters.email}"</span>
            )}
            {activeTab === "contacts" && contactFilters.status && (
              <span>
                {" "}
                | Status: "{formatStatusLabel(contactFilters.status)}"
              </span>
            )}
          </div>
        )}

        {statusUpdateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {statusUpdateError}
          </div>
        )}

        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full grid-cols-4 mb-6 sm:mb-8">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({filteredData?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs sm:text-sm">
              Jobs ({filteredData?.totalJobs || 0})
            </TabsTrigger>
            <TabsTrigger value="interns" className="text-xs sm:text-sm">
              Interns ({filteredData?.totalInterns || 0})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs sm:text-sm">
              Contacts ({filteredData?.totalContacts || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-6">
              {filteredData?.jobApplications.map((app) => (
                <JobApplicationCard
                  key={app._id}
                  application={app}
                  isUpdating={Boolean(updatingKeys[`job:${app._id}`])}
                  onStatusChange={(status) =>
                    updateEntityStatus("job", app._id, status)
                  }
                />
              ))}
              {filteredData?.internApplications.map((app) => (
                <InternApplicationCard
                  key={app._id}
                  application={app}
                  isUpdating={Boolean(updatingKeys[`intern:${app._id}`])}
                  onStatusChange={(status) =>
                    updateEntityStatus("intern", app._id, status)
                  }
                />
              ))}
              {filteredData?.contacts.map((contact) => (
                <ContactSubmissionCard
                  key={contact._id}
                  contact={contact}
                  isUpdating={Boolean(updatingKeys[`contact:${contact._id}`])}
                  onStatusChange={(status) =>
                    updateEntityStatus("contact", contact._id, status)
                  }
                />
              ))}
              {!filteredData?.jobApplications.length &&
                !filteredData?.internApplications.length &&
                !filteredData?.contacts.length && (
                  <p className="text-center text-gray-500 py-8">
                    No applications found matching your search criteria
                  </p>
                )}
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <div className="grid gap-6">
              {filteredData?.jobApplications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No job applications found
                </p>
              ) : (
                filteredData?.jobApplications.map((app) => (
                  <JobApplicationCard
                    key={app._id}
                    application={app}
                    isUpdating={Boolean(updatingKeys[`job:${app._id}`])}
                    onStatusChange={(status) =>
                      updateEntityStatus("job", app._id, status)
                    }
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="interns" className="space-y-4">
            <div className="grid gap-6">
              {filteredData?.internApplications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No internship applications found
                </p>
              ) : (
                filteredData?.internApplications.map((app) => (
                  <InternApplicationCard
                    key={app._id}
                    application={app}
                    isUpdating={Boolean(updatingKeys[`intern:${app._id}`])}
                    onStatusChange={(status) =>
                      updateEntityStatus("intern", app._id, status)
                    }
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div className="grid gap-6">
              {filteredData?.contacts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No contact submissions found
                </p>
              ) : (
                filteredData?.contacts.map((contact) => (
                  <ContactSubmissionCard
                    key={contact._id}
                    contact={contact}
                    isUpdating={Boolean(updatingKeys[`contact:${contact._id}`])}
                    onStatusChange={(status) =>
                      updateEntityStatus("contact", contact._id, status)
                    }
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ViewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ViewsPageContent />
    </Suspense>
  );
}

function JobApplicationCard({
  application,
  onStatusChange,
  isUpdating,
}: {
  application: JobApplication;
  onStatusChange: (status: ApplicationStatus) => void;
  isUpdating: boolean;
}) {
  const currentStatus = application.status || "PENDING";

  return (
    <Card className="hover:shadow-lg transition-shadow w-full overflow-x-hidden overflow-y-visible">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl sm:text-2xl break-words">
              {application.full_name}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Applied on{" "}
              {new Date(application.created_at).toLocaleString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
            <Badge variant="default" className="shrink-0">
              Job Application
            </Badge>
            <div className="w-full sm:w-44">
              <select
                aria-label="Job application status"
                value={currentStatus}
                onChange={(e) =>
                  onStatusChange(e.target.value as ApplicationStatus)
                }
                disabled={isUpdating}
                className={`w-full rounded-md border px-2.5 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60 ${getStatusColor(currentStatus)}`}
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              {isUpdating && (
                <p className="text-[11px] text-gray-500 mt-1">Updating...</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="space-y-4 overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                Position
              </h3>
              <p className="text-sm sm:text-base break-words">
                {application.position}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                Area
              </h3>
              <p className="text-sm sm:text-base break-words">
                {application.area}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                Expected Package
              </h3>
              <p className="text-sm sm:text-base">
                {(application.expectedPackage.endsWith("LPA")
                  ? application.expectedPackage
                  : application.expectedPackage + " LPA") || "Not specified"}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                Experience Level
              </h3>
              <p className="text-sm sm:text-base">
                {application.information.experienceLevel
                  .charAt(0)
                  .toUpperCase() +
                  application.information.experienceLevel.slice(1)}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                Years of Experience
              </h3>
              <p className="text-sm sm:text-base">
                {application.information.yearsOfExperience}
              </p>
            </div>
            {application.information.currentEmploymentStatus && (
              <div className="min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                  Current Status
                </h3>
                <p className="text-sm sm:text-base">
                  {application.information.currentEmploymentStatus}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Contact
            </h3>
            <p className="text-xs sm:text-sm break-all overflow-wrap-anywhere">
              Email: {application.contactInfo.email}
            </p>
            <p className="text-xs sm:text-sm break-words">
              Phone: {application.contactInfo.phone}
            </p>
          </div>

          <div className="min-w-0 w-full">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Skills
            </h3>
            <div className="flex flex-wrap gap-2 w-full overflow-visible">
              {application.job.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs sm:text-sm whitespace-pre-wrap break-words max-w-full inline-block"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Links
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <a
                href={application.links.resumeURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs sm:text-sm"
              >
                Resume
              </a>
              <a
                href={application.links.linkedinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs sm:text-sm"
              >
                LinkedIn
              </a>
              {application.links.githubURL && (
                <a
                  href={application.links.githubURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs sm:text-sm"
                >
                  GitHub
                </a>
              )}
              {application.links.portfolioURL && (
                <a
                  href={application.links.portfolioURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs sm:text-sm"
                >
                  Portfolio
                </a>
              )}
              {application.links.showcaseURL && (
                <a
                  href={application.links.showcaseURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs sm:text-sm"
                >
                  Showcase
                </a>
              )}
            </div>
          </div>

          {application.job.coverLetter && (
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
                Cover Letter
              </h3>
              <p className="text-xs sm:text-sm whitespace-pre-wrap bg-gray-50 p-2 sm:p-3 rounded break-words">
                {application.job.coverLetter}
              </p>
            </div>
          )}

          {application.job.achievements && (
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
                Achievements
              </h3>
              <p className="text-xs sm:text-sm whitespace-pre-wrap bg-gray-50 p-2 sm:p-3 rounded break-words">
                {application.job.achievements}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InternApplicationCard({
  application,
  onStatusChange,
  isUpdating,
}: {
  application: InternApplication;
  onStatusChange: (status: ApplicationStatus) => void;
  isUpdating: boolean;
}) {
  const currentStatus = application.status || "PENDING";

  return (
    <Card className="hover:shadow-lg transition-shadow w-full overflow-x-hidden overflow-y-visible">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl sm:text-2xl break-words">
              {application.full_name}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Applied:{" "}
              {new Date(application.created_at).toLocaleString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
            <Badge variant="outline" className="shrink-0">
              Internship Application
            </Badge>
            <div className="w-full sm:w-44">
              <select
                aria-label="Internship application status"
                value={currentStatus}
                onChange={(e) =>
                  onStatusChange(e.target.value as ApplicationStatus)
                }
                disabled={isUpdating}
                className={`w-full rounded-md border px-2.5 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60 ${getStatusColor(currentStatus)}`}
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              {isUpdating && (
                <p className="text-[11px] text-gray-500 mt-1">Updating...</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="space-y-4 overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                College
              </h3>
              <p className="text-sm sm:text-base break-words">
                {application.college}
              </p>
            </div>
            {application.information.experience && (
              <div className="min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-gray-500">
                  Experience
                </h3>
                <p className="text-sm sm:text-base break-words">
                  {application.information.experience}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Contact
            </h3>
            <p className="text-xs sm:text-sm break-all overflow-wrap-anywhere">
              Email: {application.contactInfo.email}
            </p>
            <p className="text-xs sm:text-sm break-words">
              Phone: {application.contactInfo.phone}
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Links
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <a
                href={application.links.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs sm:text-sm"
              >
                Resume
              </a>
              <a
                href={application.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs sm:text-sm"
              >
                LinkedIn
              </a>
              {application.links.portfolioLink && (
                <a
                  href={application.links.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs sm:text-sm"
                >
                  Portfolio
                </a>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Message
            </h3>
            <p className="text-xs sm:text-sm whitespace-pre-wrap bg-gray-50 p-2 sm:p-3 rounded break-words">
              {application.information.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactSubmissionCard({
  contact,
  onStatusChange,
  isUpdating,
}: {
  contact: ContactSubmission;
  onStatusChange: (status: ContactStatus) => void;
  isUpdating: boolean;
}) {
  const currentStatus = contact.status || "PENDING";

  return (
    <Card className="hover:shadow-lg transition-shadow w-full overflow-x-hidden overflow-y-visible">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl sm:text-2xl break-words">
              {contact.full_name}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Submitted on{" "}
              {new Date(contact.created_at).toLocaleString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
            <Badge variant="secondary" className="shrink-0">
              Contact
            </Badge>
            <div className="w-full sm:w-40">
              <select
                aria-label="Contact status"
                value={currentStatus}
                onChange={(e) =>
                  onStatusChange(e.target.value as ContactStatus)
                }
                disabled={isUpdating}
                className={`w-full rounded-md border px-2.5 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60 ${getStatusColor(currentStatus)}`}
              >
                {CONTACT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              {isUpdating && (
                <p className="text-[11px] text-gray-500 mt-1">Updating...</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="space-y-4 overflow-visible">
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Email
            </h3>
            <p className="text-xs sm:text-sm break-all overflow-wrap-anywhere">
              {contact.email}
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-500 mb-2">
              Message
            </h3>
            <p className="text-xs sm:text-sm whitespace-pre-wrap bg-gray-50 p-2 sm:p-3 rounded break-words">
              {contact.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
