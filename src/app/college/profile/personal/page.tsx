"use client";

import * as React from "react";
// import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  Upload,
  Save,
  X,
  Loader2,
  //   Globe,
  //   Linkedin,
  //   Mail,
  //   Phone,
  //   MapPin,
  //   Users,
  //   Award,
  //   BookOpen,
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

interface UserProfile {
  _id: string;
  role: "company" | "college";
  email: string;
  image_url?: string;
  address?: string;
  phoneNumber?: string;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { fetchJsonWithAuth } = await import("@/lib/api-client");
      const data = (await fetchJsonWithAuth("/api/auth/profile")) as {
        user: UserProfile;
      };

      if (data.user) {
        // Check if user is company or college role
        if (data.user.role !== "company" && data.user.role !== "college") {
          toast.error("Access denied. This page is for organizations only.");
          window.location.href = "/college";
          return;
        }
        setProfile(data.user);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // Ensure companySize has a valid value for company profiles
      const profileData = { ...profile };
      if (
        profileData.role === "company" &&
        (!profileData.companySize || profileData.companySize === "")
      ) {
        profileData.companySize = "1-10"; // Set default if empty
      }

      const { fetchJsonWithAuth } = await import("@/lib/api-client");
      await fetchJsonWithAuth(`/api/college/profile/${profile.role}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      // fetchJsonWithAuth automatically handles errors and parses JSON
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile(); // Refresh data
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Process image file (used by both drag/drop and file input)
  const processImageFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (1.5MB limit)
    const MAX_SIZE = 3 * 512 * 1024; // 1.5MB
    if (file.size > MAX_SIZE) {
      toast.error("File size must be less than 1.5MB");
      return;
    }

    setUploadingImage(true);
    try {
      // Convert file to base64
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

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

    await processImageFile(file);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
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

      // Process file directly instead of simulating event
      await processImageFile(file);
    }
  };

  const updateField = (
    field: string,
    value: string | number | boolean | string[],
  ) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
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

  if (loading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 border rounded-lg p-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
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
  const organizationName = isCompany
    ? profile.companyName
    : profile.collegeName;
  const Icon = isCompany ? Building2 : GraduationCap;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isCompany ? "Company" : "College"} Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your {isCompany ? "company" : "institution"} information
              and settings
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>

      {/* Profile Image & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Image */}
          <div className="flex items-center space-x-6">
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
                className={`w-24 h-24 rounded-full overflow-hidden bg-muted border-2 transition-colors ${
                  dragActive && isEditing
                    ? "border-primary border-dashed"
                    : "border-transparent"
                }`}
              >
                {profile.image_url ? (
                  <Image
                    src={profile.image_url}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {dragActive && isEditing && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-full">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              {isEditing && !dragActive && (
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                </Button>
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
            <div className="flex-1">
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
                />
              ) : (
                <p className="text-2xl font-semibold">{organizationName}</p>
              )}
            </div>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
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
            <div>
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div>
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
          <div>
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
                <div>
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
                <div>
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
                <div>
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
                <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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

              {/* Hiring Information */}
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Hiring & Opportunities
                </h3>
                <div className="space-y-4">
                  <div>
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

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="internshipAvailable"
                        checked={profile.internshipAvailable || false}
                        onCheckedChange={(checked) =>
                          updateField("internshipAvailable", checked)
                        }
                        disabled={!isEditing}
                      />
                      <Label htmlFor="internshipAvailable">
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
                      <Label htmlFor="placementPartnership">
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
                <div>
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
                <div>
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
                <div>
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
                <div>
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
              <div>
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
              <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
              <div>
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="internshipSupport"
                  checked={profile.internshipSupport || false}
                  onCheckedChange={(checked) =>
                    updateField("internshipSupport", checked)
                  }
                  disabled={!isEditing}
                />
                <Label htmlFor="internshipSupport">
                  Internship Support Available
                </Label>
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
