"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
// import { motion } from "framer-motion";
import {
  Upload,
  Save,
  X,
  Loader2,
  Building2,
  Github,
  Link,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfilePageSkeleton } from "@/components/ui/profile-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

interface Member {
  email: string;
  subrole: string;
  status: string;
  invitedAt?: string;
  joinedAt?: string;
  _id?: string;
}

interface UserProfile {
  _id: string;
  role: "company" | "college";
  email: string;
  image_url?: string;
  address?: string;
  phoneNumber?: string;
  members?: Member[];
  // Company fields
  companyName?: string;
  industry?: string;
  contactPersonName?: string;
  designation?: string;
  companyDescription?: string;
  industryType?: string;
  companySize?: string;
  headquartersLocation?: string;
  officialWebsite?: string;
  linkedinProfile?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  hiringRolesOffered?: string[];
  internshipAvailable?: boolean;
  placementPartnership?: boolean;
  // College fields
  collegeName?: string;
  collegeType?: string;
  collegeDescription?: string;
  affiliatedUniversity?: string;
  accreditation?: string[];
  campusLocation?: string;
  placementCellEmail?: string;
  placementCellPhone?: string;
  coursesOffered?: string[];
  totalStudents?: number;
  averagePlacementRate?: number;
  topRecruiters?: string[];
  internshipSupport?: boolean;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const COLLEGE_TYPES = [
  "Engineering College",
  "University",
  "Polytechnic",
  "School / Other",
];

const DESIGNATION_COMPANY = ["HR", "Recruiter", "Founder", "Manager"];

const DESIGNATION_COLLEGE = ["TPO / Placement Officer", "Faculty", "Admin"];

const ACCREDITATIONS = ["NAAC", "NBA", "NIRF", "AICTE", "UGC", "ABET"];

export default function OrganizationProfilePage() {
  // Hooks
  return (
    <React.Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageContent />
    </React.Suspense>
  );
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const [accepting, setAccepting] = React.useState(false);
  const [acceptStatus, setAcceptStatus] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const user_id = profile?._id || "CURRENT_USER_ID";
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(
    null,
  );

  const hasChanges = React.useMemo(() => {
    if (!profile || !initialProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(initialProfile);
  }, [profile, initialProfile]);

  // Find logged-in user's subrole from members array
  interface Member {
    email: string;
    subrole: string;
    status: string;
    invitedAt?: string;
    joinedAt?: string;
    _id?: string;
  }
  const companySubrole = React.useMemo(() => {
    if (!profile || !profile.members || !Array.isArray(profile.members))
      return "trainee";
    const member = profile.members.find(
      (m: Member) => m.email === profile.email,
    );
    return normalizeCompanySubrole(member?.subrole);
  }, [profile]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    if (inviteToken && user_id) {
      setAccepting(true);
      fetch("/api/company/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, user_id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAcceptStatus("Invite accepted! You are now a team member.");
            setTimeout(() => setAcceptStatus(null), 2000);
            fetchProfile();
          } else {
            setAcceptStatus(data.error || "Failed to accept invite.");
          }
        })
        .finally(() => setAccepting(false));
    }
  }, [inviteToken, user_id]);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Helper functions
  async function fetchProfile() {
    try {
      const { fetchJsonWithAuth } = await import("@/lib/api-client");
      const data = (await fetchJsonWithAuth("/api/auth/profile")) as {
        user: UserProfile;
      };
      if (data.user) {
        if (data.user.role !== "company" && data.user.role !== "college") {
          toast.error("Access denied. This page is for organizations only.");
          window.location.href = "/dashboard";
          return;
        }
        setProfile(data.user);
        setInitialProfile(data.user);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const profileData = { ...profile };
      if (
        profileData.role === "company" &&
        (!profileData.companySize || profileData.companySize === "")
      ) {
        toast.error("Company size is required.");
        setSaving(false);
        return;
      }

      // Only owner and admin can save
      if (companySubrole !== "owner" && companySubrole !== "admin") {
        toast.error("You do not have permission to edit the profile.");
        setSaving(false);
        return;
      }

      // Remove fields that shouldn't be sent
      const { _id, email, role, members, ...updated_ata } = profileData;
      void _id;
      void email;
      void role;
      void members;

      const { fetchWithAuth } = await import("@/lib/api-client");
      const response = await fetchWithAuth(
        profileData.role === "company"
          ? "/api/dashboard/profile/company"
          : `/api/dashboard/profile/${profileData.role}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated_ata),
        },
      );

      if (response.ok) {
        toast.success("Profile saved successfully!");
        setIsEditing(false);
        await fetchProfile();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save profile.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file) return;
    const MAX_SIZE = 3 * 512 * 1024; // 1.5MB
    if (file.size > MAX_SIZE) {
      toast.error("File size must be less than 1.5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };
      const base64 = await toBase64(file);
      const payload = {
        image: { file: base64, fileType: file.type },
      };
      const { fetchWithAuth } = await import("@/lib/api-client");
      const response = await fetchWithAuth("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.image || "Failed to upload image");
      }
      const data = await response.json();
      const image_url = data.results?.image?.secure_url;
      if (!image_url) {
        throw new Error("No URL returned from upload");
      }
      setProfile((prev) => (prev ? { ...prev, image_url } : prev));
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (typeof processImageFile === "function") {
      await processImageFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!isEditing) return;
    const files = e.dataTransfer.files;
    if (files?.length) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      await processImageFile(file);
    }
  };

  const updateField = (
    field: string,
    value: string | number | boolean | string[],
  ) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSocialChange = (key: string, value: string) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            socialLinks: prev.socialLinks
              ? { ...prev.socialLinks, [key]: value }
              : { [key]: value },
          }
        : prev,
    );
  };

  const addArrayItem = (field: string, item: string) => {
    if (!item.trim()) return;
    setProfile((prev) => {
      if (!prev) return prev;
      const currentArray =
        ((prev as unknown as Record<string, unknown>)[field] as string[]) || [];
      return { ...prev, [field]: [...currentArray, item.trim()] };
    });
  };

  const removeArrayItem = (field: string, index: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const currentArray =
        ((prev as unknown as Record<string, unknown>)[field] as string[]) || [];
      return {
        ...prev,
        [field]: currentArray.filter((_: string, i: number) => i !== index),
      };
    });
  };

  if (accepting || loading) {
    return <ProfilePageSkeleton />;
  }

  if (acceptStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p>{acceptStatus}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p>Unable to load profile. Please try again.</p>
            <Button onClick={fetchProfile} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompany = profile.role === "company";
  const organizationName = profile.companyName;
  const Icon = Building2;

  return (
    <div className="container mx-auto space-y-6">
      {/* Profile Image & Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Basic Information</CardTitle>
            {companySubrole === "owner" || companySubrole === "admin" ? (
              isEditing ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProfile(initialProfile);
                      setIsEditing(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto"
                >
                  Edit Profile
                </Button>
              )
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 py-2">
            <div
              className={`relative ${isEditing ? "cursor-pointer" : ""}`}
              onDragEnter={isEditing ? handleDragEnter : undefined}
              onDragLeave={isEditing ? handleDragLeave : undefined}
              onDragOver={isEditing ? handleDragOver : undefined}
              onDrop={isEditing ? handleDrop : undefined}
              onClick={
                isEditing ? () => fileInputRef.current?.click() : undefined
              }
            >
              <div
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-muted border-2 transition-colors ${
                  dragActive && isEditing
                    ? "border-primary border-dashed"
                    : "border-transparent"
                }`}
              >
                {profile.image_url ? (
                  <Image
                    src={profile.image_url}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                {dragActive && isEditing && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-full">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
              {isEditing && !dragActive && (
                <div className="flex flex-col items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingImage}
                    className="w-full sm:w-auto"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                </div>
              )}
              <input
                placeholder="Enter value"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100">
                  {isCompany ? "Company Logo" : "College Logo"}
                </h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  This logo will be displayed on your profile and project
                  boards.
                </p>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                <Label htmlFor="organizationName">
                  {isCompany ? "Company Name" : "College Name"}
                </Label>
                {isEditing ? (
                  <Input
                    id="organizationName"
                    value={organizationName || ""}
                    onChange={(e) =>
                      updateField(
                        isCompany ? "companyName" : "collegeName",
                        e.target.value,
                      )
                    }
                    placeholder={`Enter ${isCompany ? "company" : "college"} name`}
                    className="max-w-md"
                  />
                ) : (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 font-medium">
                    {organizationName || "Not set"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPersonName">Contact Person Name</Label>
              {isEditing ? (
                <Input
                  id="contactPersonName"
                  value={profile.contactPersonName || ""}
                  onChange={(e) =>
                    updateField("contactPersonName", e.target.value)
                  }
                />
              ) : (
                <p>{profile.contactPersonName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              {isEditing ? (
                <Select
                  value={profile.designation || ""}
                  onValueChange={(value) => updateField("designation", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isCompany
                      ? DESIGNATION_COMPANY
                      : DESIGNATION_COLLEGE
                    ).map((des) => (
                      <SelectItem key={des} value={des}>
                        {des}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p>{profile.designation}</p>
              )}
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phoneNumber"
                  value={profile.phoneNumber || ""}
                  onChange={(e) => updateField("phoneNumber", e.target.value)}
                />
              ) : (
                <p>{profile.phoneNumber || "Not provided"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isCompany ? "Company Details" : "Institution Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {isCompany ? "Company Description" : "College Description"}
            </Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={
                  isCompany
                    ? profile.companyDescription || ""
                    : profile.collegeDescription || ""
                }
                onChange={(e) =>
                  updateField(
                    isCompany ? "companyDescription" : "collegeDescription",
                    e.target.value,
                  )
                }
                placeholder={`Describe your ${isCompany ? "company" : "institution"}...`}
                rows={4}
              />
            ) : (
              <p className="text-sm">
                {(isCompany
                  ? profile.companyDescription
                  : profile.collegeDescription) || "No description provided"}
              </p>
            )}
          </div>

          {isCompany ? (
            <>
              {/* Company-specific fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  {isEditing ? (
                    <Input
                      id="industry"
                      value={profile.industry || ""}
                      onChange={(e) => updateField("industry", e.target.value)}
                    />
                  ) : (
                    <p>{profile.industry}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industryType">Industry Type</Label>
                  {isEditing ? (
                    <Input
                      id="industryType"
                      value={profile.industryType || ""}
                      onChange={(e) =>
                        updateField("industryType", e.target.value)
                      }
                    />
                  ) : (
                    <p>{profile.industryType || "Not specified"}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  {isEditing ? (
                    <Select
                      value={profile.companySize || "1-10"}
                      onValueChange={(value) =>
                        updateField("companySize", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} employees
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p>
                      {profile.companySize
                        ? `${profile.companySize} employees`
                        : "Not specified"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headquartersLocation">
                    Headquarters Location
                  </Label>
                  {isEditing ? (
                    <Input
                      id="headquartersLocation"
                      value={profile.headquartersLocation || ""}
                      onChange={(e) =>
                        updateField("headquartersLocation", e.target.value)
                      }
                    />
                  ) : (
                    <p>{profile.headquartersLocation || "Not specified"}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPersonEmail">
                      Contact Person Email
                    </Label>
                    {isEditing ? (
                      <Input
                        id="contactPersonEmail"
                        type="email"
                        value={profile.contactPersonEmail || ""}
                        onChange={(e) =>
                          updateField("contactPersonEmail", e.target.value)
                        }
                      />
                    ) : (
                      <p>{profile.contactPersonEmail || "Not provided"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPersonPhone">
                      Contact Person Phone
                    </Label>
                    {isEditing ? (
                      <Input
                        id="contactPersonPhone"
                        value={profile.contactPersonPhone || ""}
                        onChange={(e) =>
                          updateField("contactPersonPhone", e.target.value)
                        }
                      />
                    ) : (
                      <p>{profile.contactPersonPhone || "Not provided"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Web Presence */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">Web Presence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officialWebsite">Official Website</Label>
                    {isEditing ? (
                      <Input
                        id="officialWebsite"
                        type="url"
                        value={profile.officialWebsite || ""}
                        onChange={(e) =>
                          updateField("officialWebsite", e.target.value)
                        }
                      />
                    ) : (
                      <p>
                        {profile.officialWebsite ? (
                          <a
                            href={profile.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {profile.officialWebsite}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinProfile">LinkedIn Profile</Label>
                    {isEditing ? (
                      <Input
                        id="linkedinProfile"
                        type="url"
                        value={profile.linkedinProfile || ""}
                        onChange={(e) =>
                          updateField("linkedinProfile", e.target.value)
                        }
                      />
                    ) : (
                      <p>
                        {profile.linkedinProfile ? (
                          <a
                            href={profile.linkedinProfile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {profile.linkedinProfile}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* GitHub Connection */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Integration
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  {profile.socialLinks?.github || (profile as any).githubId ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Github className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            Successfully Connected
                          </p>
                          <a
                            href={profile.socialLinks?.github || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            {profile.socialLinks?.github
                              ? profile.socialLinks.github.replace(
                                  "https://github.com/",
                                  "@",
                                )
                              : "Connected"}
                            <Link className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg">
                          <Github className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            GitHub Not Connected
                          </p>
                          <p className="text-sm text-slate-500">
                            Connect your account to link repositories to
                            projects.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const userType =
                            profile.role === "company" ? "company" : "college";
                          window.location.href = `/api/auth/oauth/github?type=${userType}&redirect=${encodeURIComponent(window.location.pathname)}`;
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                      >
                        Connect Account
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hiring Information */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Hiring & Opportunities
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Hiring Roles Offered</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.hiringRolesOffered?.map((role, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {role}
                          {isEditing && (
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() =>
                                removeArrayItem("hiringRolesOffered", index)
                              }
                            />
                          )}
                        </Badge>
                      ))}
                      {isEditing && (
                        <AddItemInput
                          onAdd={(value) =>
                            addArrayItem("hiringRolesOffered", value)
                          }
                          placeholder="Add role..."
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="internshipAvailable"
                        checked={profile.internshipAvailable || false}
                        onCheckedChange={(checked) =>
                          updateField("internshipAvailable", checked)
                        }
                        disabled={!isEditing}
                      />
                      <Label htmlFor="internshipAvailable" className="text-sm">
                        Internship Available
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="placementPartnership"
                        checked={profile.placementPartnership || false}
                        onCheckedChange={(checked) =>
                          updateField("placementPartnership", checked)
                        }
                        disabled={!isEditing}
                      />
                      <Label htmlFor="placementPartnership" className="text-sm">
                        Placement Partnership
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* College-specific fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collegeType">College Type</Label>
                  {isEditing ? (
                    <Select
                      value={profile.collegeType || ""}
                      onValueChange={(value) =>
                        updateField("collegeType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select college type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p>{profile.collegeType}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliatedUniversity">
                    Affiliated University
                  </Label>
                  {isEditing ? (
                    <Input
                      id="affiliatedUniversity"
                      value={profile.affiliatedUniversity || ""}
                      onChange={(e) =>
                        updateField("affiliatedUniversity", e.target.value)
                      }
                    />
                  ) : (
                    <p>{profile.affiliatedUniversity || "Not specified"}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campusLocation">Campus Location</Label>
                  {isEditing ? (
                    <Input
                      id="campusLocation"
                      value={profile.campusLocation || ""}
                      onChange={(e) =>
                        updateField("campusLocation", e.target.value)
                      }
                    />
                  ) : (
                    <p>{profile.campusLocation || "Not specified"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officialWebsite">Official Website</Label>
                  {isEditing ? (
                    <Input
                      id="officialWebsite"
                      type="url"
                      value={profile.officialWebsite || ""}
                      onChange={(e) =>
                        updateField("officialWebsite", e.target.value)
                      }
                    />
                  ) : (
                    <p>
                      {profile.officialWebsite ? (
                        <a
                          href={profile.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {profile.officialWebsite}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Accreditation */}
              <div className="space-y-2">
                <Label>Accreditation</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.accreditation?.map((acc, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {acc}
                      {isEditing && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            removeArrayItem("accreditation", index)
                          }
                        />
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <AddItemInput
                      onAdd={(value) => addArrayItem("accreditation", value)}
                      placeholder="Add accreditation..."
                      suggestions={ACCREDITATIONS}
                    />
                  )}
                </div>
              </div>

              {/* Courses Offered */}
              <div className="space-y-2">
                <Label>Courses Offered</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.coursesOffered?.map((course, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {course}
                      {isEditing && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            removeArrayItem("coursesOffered", index)
                          }
                        />
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <AddItemInput
                      onAdd={(value) => addArrayItem("coursesOffered", value)}
                      placeholder="Add course..."
                    />
                  )}
                </div>
              </div>

              {/* Placement Cell Contact */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Placement Cell Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="placementCellEmail">
                      Placement Cell Email
                    </Label>
                    {isEditing ? (
                      <Input
                        id="placementCellEmail"
                        type="email"
                        value={profile.placementCellEmail || ""}
                        onChange={(e) =>
                          updateField("placementCellEmail", e.target.value)
                        }
                      />
                    ) : (
                      <p>{profile.placementCellEmail || "Not provided"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placementCellPhone">
                      Placement Cell Phone
                    </Label>
                    {isEditing ? (
                      <Input
                        id="placementCellPhone"
                        value={profile.placementCellPhone || ""}
                        onChange={(e) =>
                          updateField("placementCellPhone", e.target.value)
                        }
                      />
                    ) : (
                      <p>{profile.placementCellPhone || "Not provided"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalStudents">Total Students</Label>
                    {isEditing ? (
                      <Input
                        id="totalStudents"
                        type="number"
                        value={profile.totalStudents || ""}
                        onChange={(e) =>
                          updateField(
                            "totalStudents",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    ) : (
                      <p>{profile.totalStudents || 0}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averagePlacementRate">
                      Average Placement Rate (%)
                    </Label>
                    {isEditing ? (
                      <Input
                        id="averagePlacementRate"
                        type="number"
                        min="0"
                        max="100"
                        value={profile.averagePlacementRate || ""}
                        onChange={(e) =>
                          updateField(
                            "averagePlacementRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    ) : (
                      <p>{profile.averagePlacementRate || 0}%</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Recruiters */}
              <div className="space-y-2">
                <Label>Top Recruiters</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.topRecruiters?.map((recruiter, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {recruiter}
                      {isEditing && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            removeArrayItem("topRecruiters", index)
                          }
                        />
                      )}
                    </Badge>
                  ))}
                  {isEditing && (
                    <AddItemInput
                      onAdd={(value) => addArrayItem("topRecruiters", value)}
                      placeholder="Add recruiter..."
                    />
                  )}
                </div>
              </div>

              {/* Support Services */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="internshipSupport"
                    checked={profile.internshipSupport || false}
                    onCheckedChange={(checked) =>
                      updateField("internshipSupport", checked)
                    }
                    disabled={!isEditing}
                  />
                  <Label htmlFor="internshipSupport" className="text-sm">
                    Internship Support Available
                  </Label>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for adding items to arrays
function AddItemInput({
  onAdd,
  placeholder,
  suggestions = [],
}: {
  onAdd: (value: string) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase()),
  );

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setShowSuggestions(
            e.target.value.length > 0 && suggestions.length > 0,
          );
        }}
        onKeyPress={handleKeyPress}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className="w-32"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => {
                setValue(suggestion);
                setShowSuggestions(false);
                onAdd(suggestion);
                setValue("");
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
