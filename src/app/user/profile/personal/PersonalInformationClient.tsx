"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  Upload,
  Loader2,
  Plus,
  X,
  Camera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Redux imports
import { useAppDispatch, useIsDirty } from "@/redux/hooks";
import {
  updateUserProfile,
  uploadFile,
  addSkill,
  removeSkill,
  updateSocialLink,
  updateUserField,
  setDirty,
  UserProfileData,
} from "@/redux/slice/user.slice";
import { useProfileBootstrap } from "@/hooks/useProfileBootstrap";

type SocialPlatform = "github" | "linkedin" | "twitter" | "website";

const POPULAR_SKILLS = [
  "React.js",
  "TypeScript",
  "Node.js",
  "Python",
  "JavaScript (ES6+)",
  "Next.js",
  "MongoDB",
  "PostgreSQL",
];

const AVAILABLE_SKILLS = [
  "HTML5", "CSS3", "JavaScript (ES6+)", "TypeScript", "React.js", "Next.js",
  "Vue.js", "Nuxt.js", "Angular", "Svelte", "TailwindCSS", "Bootstrap",
  "Material-UI", "Ant Design", "Framer Motion", "Redux", "Zustand", "React Query",
  "Node.js", "Express.js", "NestJS", "Django", "Flask", "FastAPI", "Spring Boot",
  "REST APIs", "GraphQL", "gRPC", "tRPC", "Microservices Architecture",
  "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Cassandra", "Elasticsearch",
  "Docker", "Kubernetes", "AWS (EC2, S3, Lambda, RDS)", "Google Cloud Platform (GCP)",
  "OAuth 2.0", "JWT", "SSO (Single Sign-On)", "Role-Based Access Control (RBAC)",
  "Python", "Machine Learning", "Deep Learning", "Artificial Intelligence (AI)",
  "Data Science", "TensorFlow", "PyTorch", "Pandas", "NumPy", "LangChain",
  "Jest", "Mocha", "Cypress", "Playwright", "React Testing Library", "Postman",
  "Git", "GitHub", "GitLab", "Agile/Scrum", "Jira", "VS Code", "Linux/Unix",
  "Shell Scripting", "Nginx", "Webpack", "ESLint", "Prettier", "npm", "yarn"
];

interface PersonalInformationClientProps {
  initialUser: UserProfileData;
}

export default function PersonalInformationClient({
  initialUser,
}: PersonalInformationClientProps) {
  const dispatch = useAppDispatch();
  const isDirty = useIsDirty();
  const { user, lastUpdated } = useProfileBootstrap(initialUser);
  const [loading, setLoading] = useState(false);
  const [isSkillsDialogOpen, setIsSkillsDialogOpen] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  const buildFormFromUser = React.useCallback(
    (profile: UserProfileData): Partial<UserProfileData> => ({
      full_name: profile.full_name || "",
      email: profile.email || "",
      headline: profile.headline || "",
      bio: profile.bio || "",
      phoneNumber: profile.phoneNumber || "",
      address: profile.address || "",
      profile_picture: profile.profile_picture || profile.image_url || "",
      skills: profile.skills || [],
      socialLinks: {
        github: profile.socialLinks?.github || "",
        linkedin: profile.socialLinks?.linkedin || "",
        twitter: profile.socialLinks?.twitter || "",
        website: profile.socialLinks?.website || "",
      },
      resume: profile.resume || "",
    }),
    []
  );

  const [formData, setFormData] = useState<Partial<UserProfileData>>(() =>
    buildFormFromUser(initialUser)
  );

  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Sync form from Redux when profile is saved or when switching tabs
  useEffect(() => {
    if (user && !isDirty) {
      setFormData(buildFormFromUser(user));
    }
  }, [user, lastUpdated, isDirty, buildFormFromUser]);

  const handleInputChange = (field: keyof UserProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    dispatch(updateUserField({ field: field as string, value }));
    dispatch(setDirty(true));
  };

  const handleSocialLinkChange = (platform: SocialPlatform, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
    dispatch(updateSocialLink({ platform, url: value }));
    dispatch(setDirty(true));
  };

  const handleSkillAdd = (skill: string) => {
    if (!formData.skills?.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), skill],
      }));
      dispatch(addSkill(skill));
      dispatch(setDirty(true));
    }
  };

  const handleSkillRemove = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills?.filter((s) => s !== skill),
    }));
    dispatch(removeSkill(skill));
    dispatch(setDirty(true));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await dispatch(updateUserProfile(formData)).unwrap();
      toast.success("Personal information updated successfully!");
      dispatch(setDirty(false));
    } catch (error) {
      toast.error("Failed to update personal information");
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData(buildFormFromUser(user));
    }
    dispatch(setDirty(false));
  };

  const handleFileUpload = async (
    file: File,
    type: "profile_picture" | "resume"
  ) => {
    if (
      (type === "profile_picture" && !/^image\//.test(file.type)) ||
      (type === "resume" && file.type !== "application/pdf")
    ) {
      toast.error(
        type === "profile_picture"
          ? "Please upload an image file"
          : "Please upload a PDF file"
      );
      return;
    }

    try {
      if (type === "profile_picture") setIsUploadingProfilePic(true);
      if (type === "resume") setIsUploadingResume(true);
      
      const uploadType = type === "profile_picture" ? "image" : "pdf";
      const result = await dispatch(
        uploadFile({ file, type: uploadType })
      ).unwrap();
      
      setFormData((prev) => ({
        ...prev,
        [type]: result.secure_url,
      }));
      dispatch(setDirty(true));
      toast.success(
        type === "profile_picture"
          ? "Profile picture updated!"
          : "Resume uploaded!"
      );
    } catch (error) {
      toast.error("Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      if (type === "profile_picture") setIsUploadingProfilePic(false);
      if (type === "resume") setIsUploadingResume(false);
    }
  };

  const handleProfilePicChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file, "profile_picture");
    if (profilePicInputRef.current) profilePicInputRef.current.value = "";
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file, "resume");
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!initialUser) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-zinc-500 text-sm">No user data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── PROFILE PICTURE SECTION ─────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Profile Picture</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6 p-1">
          {/* Avatar circle with Camera overlap */}
          <div className="relative group flex-shrink-0">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700 shadow-xs relative">
              {isValidUrl(formData.profile_picture) ? (
                <Image
                  src={formData.profile_picture || ""}
                  alt={formData.full_name || "Profile"}
                  width={96}
                  height={96}
                  className="object-cover h-full w-full"
                />
              ) : (
                <span className="text-xl text-zinc-650 dark:text-zinc-300 font-bold">
                  {formData.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "?"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => profilePicInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Change photo"
            >
              <Camera className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Description & Upload details */}
          <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
            <p className="text-xs text-zinc-500 leading-relaxed">
              A professional photo helps people recognize you and builds trust. JPG or PNG up to 5MB.
            </p>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
              <Button
                variant="outline"
                className="flex items-center gap-1.5 h-9 rounded-xl border-zinc-200 text-zinc-800 dark:border-[#27272a] dark:bg-[#18181b] dark:text-white text-xs font-semibold px-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#27272a]"
                onClick={() => profilePicInputRef.current?.click()}
                disabled={isUploadingProfilePic}
              >
                {isUploadingProfilePic ? (
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Upload New Photo
              </Button>
            </div>
            <input
              ref={profilePicInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePicChange}
            />
          </div>
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── BASIC INFORMATION ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name || ""}
              onChange={(e) => handleInputChange("full_name", e.target.value)}
              className="rounded-xl border-zinc-200 dark:border-[#27272a] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 placeholder:text-zinc-500 bg-white dark:bg-[#121215] text-sm h-10 px-3.5 text-zinc-900 dark:text-white"
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email</Label>
            <Input
              id="email"
              value={formData.email || ""}
              disabled
              className="rounded-xl border-zinc-150/60 dark:border-zinc-800 bg-zinc-50/60 text-zinc-400 dark:bg-zinc-950/30 cursor-not-allowed text-sm h-10 px-3.5"
              title="Email cannot be changed"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="headline" className="text-xs font-semibold text-zinc-700 dark:text-[#F5F5F5]">Professional Headline</Label>
            <Input
              id="headline"
              value={formData.headline || ""}
              onChange={(e) => handleInputChange("headline", e.target.value)}
              placeholder="e.g., Full Stack Developer"
              className="rounded-xl border-zinc-200 dark:border-[#1E1F23] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 placeholder:text-zinc-500 dark:placeholder:text-[#71717A] bg-white dark:bg-[#111214] text-sm h-10 px-3.5 text-zinc-900 dark:text-[#F5F5F5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-xs font-semibold text-zinc-700 dark:text-[#F5F5F5]">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber || ""}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="rounded-xl border-zinc-200 dark:border-[#1E1F23] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 placeholder:text-zinc-500 dark:placeholder:text-[#71717A] bg-white dark:bg-[#111214] text-sm h-10 px-3.5 text-zinc-900 dark:text-[#F5F5F5]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs font-semibold text-zinc-700 dark:text-[#F5F5F5]">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio || ""}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            rows={4}
            placeholder="Tell us about yourself, your experience, and what you're passionate about..."
            className="rounded-xl border-zinc-200 dark:border-[#1E1F23] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 placeholder:text-zinc-500 dark:placeholder:text-[#71717A] bg-white dark:bg-[#111214] text-sm p-3.5 resize-none leading-relaxed text-zinc-900 dark:text-[#F5F5F5]"
            maxLength={500}
          />
          <div className="text-[10px] text-zinc-400 dark:text-[#71717A] text-right font-medium">
            {formData.bio?.length || 0} / 500 characters
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs font-semibold text-zinc-700 dark:text-[#F5F5F5]">Address</Label>
          <Input
            id="address"
            value={formData.address || ""}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="City, State, Country"
            className="rounded-xl border-zinc-200 dark:border-[#1E1F23] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 placeholder:text-zinc-500 dark:placeholder:text-[#71717A] bg-white dark:bg-[#111214] text-sm h-10 px-3.5 text-zinc-900 dark:text-[#F5F5F5]"
          />
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── SKILLS SECTION ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2.5 border border-zinc-150/80 dark:border-[#1E1F23] rounded-xl bg-zinc-50/50 dark:bg-[#111214]">
          {formData.skills?.length ? (
            formData.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1.5 px-3 py-1 rounded-lg text-xs border border-zinc-200/50 bg-white hover:bg-zinc-50 text-zinc-800 dark:bg-[#17181C] dark:text-[#F5F5F5] dark:border-[#26272B] font-medium"
              >
                {skill}
                <button
                  type="button"
                  className="h-3.5 w-3.5 p-0 hover:bg-transparent text-zinc-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  onClick={() => handleSkillRemove(skill)}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-zinc-400 text-xs self-center px-1">No skills added yet</span>
          )}
        </div>

        {/* Popular Skills Quick-Add */}
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-400 dark:text-[#71717A] font-semibold uppercase tracking-wider">Popular Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.filter(
              (skill) => !formData.skills?.includes(skill)
            ).map((skill) => (
              <Button
                key={skill}
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 rounded-xl border-zinc-200 text-zinc-800 hover:bg-zinc-950 hover:text-white dark:border-[#26272B] dark:bg-[#17181C] dark:text-[#F5F5F5] dark:hover:bg-[#26272B] transition-colors cursor-pointer font-medium"
                onClick={() => handleSkillAdd(skill)}
              >
                <Plus className="h-3 w-3" />
                {skill}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 rounded-xl border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-950 hover:text-zinc-950 dark:border-[#26272B] dark:text-[#A1A1AA] dark:hover:border-[#F5F5F5] dark:hover:text-[#F5F5F5] transition-colors cursor-pointer font-semibold"
              onClick={() => setIsSkillsDialogOpen(true)}
            >
              More Skills →
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── SOCIAL LINKS ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">Social Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 border border-zinc-150/80 bg-zinc-50/50 dark:border-[#26272B] dark:bg-[#17181C] rounded-xl flex-shrink-0 text-zinc-600 dark:text-[#F5F5F5]">
              <Github className="h-4.5 w-4.5" />
            </div>
            <Input
              disabled
              value={formData.socialLinks?.github || ""}
              onChange={(e) => handleSocialLinkChange("github", e.target.value)}
              placeholder="https://github.com/username"
              className="flex-1 rounded-xl border-zinc-150/60 bg-zinc-50/60 text-zinc-450 dark:border-[#1E1F23] dark:bg-[#111214] dark:text-[#A1A1AA] cursor-not-allowed h-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 border border-zinc-150/80 bg-zinc-50/50 dark:border-[#26272B] dark:bg-[#17181C] rounded-xl flex-shrink-0 text-zinc-600 dark:text-[#F5F5F5]">
              <Linkedin className="h-4.5 w-4.5" />
            </div>
            <Input
              value={formData.socialLinks?.linkedin || ""}
              onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="flex-1 rounded-xl border-zinc-200 dark:border-[#1E1F23] dark:bg-[#111214] dark:text-[#F5F5F5] placeholder:text-zinc-500 dark:placeholder:text-[#71717A] h-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 border border-zinc-150/80 bg-zinc-50/50 dark:border-[#26272B] dark:bg-[#17181C] rounded-xl flex-shrink-0 text-zinc-600 dark:text-[#F5F5F5]">
              <Twitter className="h-4.5 w-4.5" />
            </div>
            <Input
              value={formData.socialLinks?.twitter || ""}
              onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
              placeholder="https://x.com/username"
              className="flex-1 rounded-xl border-zinc-200 dark:border-[#1E1F23] dark:bg-[#111214] dark:text-[#F5F5F5] placeholder:text-zinc-500 dark:placeholder:text-[#71717A] h-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 border border-zinc-150/80 bg-zinc-50/50 dark:border-[#26272B] dark:bg-[#17181C] rounded-xl flex-shrink-0 text-zinc-600 dark:text-[#F5F5F5]">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <Input
              value={formData.socialLinks?.website || ""}
              onChange={(e) => handleSocialLinkChange("website", e.target.value)}
              placeholder="https://yourwebsite.com"
              className="flex-1 rounded-xl border-zinc-200 dark:border-[#1E1F23] dark:bg-[#111214] dark:text-[#F5F5F5] placeholder:text-zinc-500 dark:placeholder:text-[#71717A] h-9"
            />
          </div>
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── RESUME SECTION ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#F5F5F5]">Resume</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-zinc-200/60 dark:border-[#1E1F23] rounded-xl bg-zinc-50/50 dark:bg-[#111214] relative">
          {isUploadingResume && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#111214]/80 z-10 rounded-xl">
              <Loader2 className="animate-spin h-6 w-6 text-zinc-900 dark:text-[#F5F5F5]" />
            </div>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-1.5 h-8.5 rounded-xl border-zinc-200 text-zinc-800 dark:border-[#26272B] dark:bg-[#17181C] dark:text-[#F5F5F5] dark:hover:bg-[#26272B] text-xs font-semibold px-4 cursor-pointer hover:bg-zinc-50 transition-colors"
            type="button"
            onClick={() => resumeInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Resume (PDF)
          </Button>
          <input
            ref={resumeInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleResumeChange}
          />
          {!isUploadingResume && (
            isValidUrl(formData.resume) ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Resume uploaded</span>
                <Button
                  variant="link"
                  size="sm"
                  className="text-zinc-500 hover:text-black dark:text-[#A1A1AA] dark:hover:text-white text-xs font-semibold p-0 h-auto cursor-pointer"
                  onClick={() =>
                    formData.resume &&
                    window.open(
                      `https://docs.google.com/viewer?url=${encodeURIComponent(
                        formData.resume
                      )}&embedded=true`,
                      "_blank"
                    )
                  }
                >
                  View Resume
                </Button>
              </div>
            ) : (
              <span className="text-xs text-zinc-450 dark:text-[#71717A]">No resume uploaded</span>
            )
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-100 dark:border-[#1E1F23] mt-6 w-full">
        <Button
          onClick={handleSave}
          disabled={loading || !isDirty}
          className="gap-2 cursor-pointer bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl font-semibold px-6 py-2.5 h-10 w-full sm:w-auto text-sm transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={loading || !isDirty}
          className="gap-2 cursor-pointer border-zinc-200 hover:bg-zinc-50 dark:border-[#26272B] dark:bg-transparent dark:text-[#F5F5F5] dark:hover:bg-[#17181C] rounded-xl font-semibold px-6 py-2.5 h-10 w-full sm:w-auto text-sm transition-all"
        >
          Cancel
        </Button>
        {isDirty && (
          <p className="text-xs text-zinc-400 dark:text-[#71717A] self-center font-medium ml-0 sm:ml-2 mt-1 sm:mt-0">
            You have unsaved changes.
          </p>
        )}
      </div>

      {/* ── SKILLS DIALOG ───────────────────────────────────────────── */}
      <Dialog open={isSkillsDialogOpen} onOpenChange={setIsSkillsDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#111214] border border-zinc-250/60 dark:border-[#1E1F23] rounded-2xl shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide uppercase text-zinc-900 dark:text-[#F5F5F5]">Add Skills</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Search skills..."
              value={skillSearchQuery}
              onChange={(e) => setSkillSearchQuery(e.target.value.toLowerCase())}
              className="rounded-xl border-zinc-200 dark:border-[#1E1F23] bg-white dark:bg-[#17181C] text-zinc-900 dark:text-[#F5F5F5] placeholder:text-zinc-500 dark:placeholder:text-[#71717A] h-10 px-3.5 mb-4"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
              {AVAILABLE_SKILLS.filter(
                (skill) =>
                  !formData.skills?.includes(skill) &&
                  skill.toLowerCase().includes(skillSearchQuery)
              ).map((skill) => (
                <Button
                  key={skill}
                  variant="outline"
                  className="justify-start text-left text-xs h-9 py-2 px-3 border-zinc-200 hover:bg-zinc-950 hover:text-white dark:border-[#26272B] dark:bg-[#17181C] dark:text-[#F5F5F5] dark:hover:bg-[#26272B] rounded-xl transition-colors cursor-pointer"
                  onClick={() => handleSkillAdd(skill)}
                >
                  <Plus className="h-3 w-3 mr-1.5 flex-shrink-0" />
                  <span className="truncate">{skill}</span>
                </Button>
              ))}
            </div>
            {AVAILABLE_SKILLS.filter(
              (skill) =>
                !formData.skills?.includes(skill) &&
                skill.toLowerCase().includes(skillSearchQuery)
            ).length === 0 && (
              <div className="text-center text-xs text-zinc-400 py-8">
                {skillSearchQuery
                  ? "No skills found matching your search"
                  : "All available skills have been added"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
