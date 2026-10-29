"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAppDispatch, useIsDirty } from "@/redux/hooks";
import {
  updateUserProfile,
  updateEducation,
  setDirty,
  UserProfileData,
} from "@/redux/slice/user.slice";
import { useProfileBootstrap } from "@/hooks/useProfileBootstrap";

interface EducationClientProps {
  initialUser: UserProfileData;
}

export default function EducationClient({ initialUser }: EducationClientProps) {
  const dispatch = useAppDispatch();
  const isDirty = useIsDirty();
  const { user, lastUpdated } = useProfileBootstrap(initialUser);
  const [loading, setLoading] = useState(false);

  const buildFormFromUser = React.useCallback(
    (profile: UserProfileData): Partial<UserProfileData> => ({
      education: {
        degree: profile.education?.degree || "",
        fieldOfStudy: profile.education?.fieldOfStudy || "",
        institution: profile.education?.institution || "",
        graduationYear: profile.education?.graduationYear || "",
        gpa: profile.education?.gpa || "",
      },
    }),
    []
  );

  const [formData, setFormData] = useState<Partial<UserProfileData>>(() =>
    buildFormFromUser(initialUser)
  );

  useEffect(() => {
    if (user && !isDirty) {
      setFormData(buildFormFromUser(user));
    }
  }, [user, lastUpdated, isDirty, buildFormFromUser]);

  const handleEducationChange = (field: string, value: string) => {
    const updatedEducation = {
      ...formData.education,
      [field]: value,
    };

    setFormData((prev) => ({
      ...prev,
      education: updatedEducation,
    }));

    dispatch(updateEducation({ [field]: value }));
    dispatch(setDirty(true));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      toast.success("Education updated successfully!");
      dispatch(setDirty(false));
    } catch (error) {
      toast.error("Failed to update education");
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

  return (
    <div className="space-y-6">
      {/* Education form wrapper (clean and spacious layout) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-850/50 pb-3">
          <GraduationCap className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          <h3 className="text-sm font-semibold">Academic Information</h3>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="degree" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Degree</Label>
              <Input
                id="degree"
                value={formData.education?.degree || ""}
                onChange={(e) => handleEducationChange("degree", e.target.value)}
                placeholder="e.g., Bachelor of Technology"
                className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fieldOfStudy" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                value={formData.education?.fieldOfStudy || ""}
                onChange={(e) => handleEducationChange("fieldOfStudy", e.target.value)}
                placeholder="e.g., Computer Science"
                className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="institution" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Institution</Label>
              <Input
                id="institution"
                value={formData.education?.institution || ""}
                onChange={(e) => handleEducationChange("institution", e.target.value)}
                placeholder="e.g., XYZ University"
                className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="graduationYear" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Graduation Year</Label>
              <Input
                id="graduationYear"
                value={formData.education?.graduationYear || ""}
                onChange={(e) => handleEducationChange("graduationYear", e.target.value)}
                placeholder="e.g., 2024"
                className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gpa" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">GPA or CGPA (Optional)</Label>
            <Input
              id="gpa"
              value={formData.education?.gpa || ""}
              onChange={(e) => handleEducationChange("gpa", e.target.value)}
              placeholder="e.g., 3.8/5.0 or 7.5/10.0"
              className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5 md:w-1/2"
            />
          </div>
        </div>
      </motion.div>

      {/* Action Buttons rendered inline at the bottom */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-850/50 mt-6 w-full">
        <Button
          onClick={handleSave}
          disabled={loading || !isDirty}
          className="gap-2 cursor-pointer bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-5 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-semibold px-6 py-2.5 h-10 w-full sm:w-auto text-sm transition-all"
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
          className="gap-2 cursor-pointer border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 rounded-xl font-semibold px-6 py-2.5 h-10 w-full sm:w-auto text-sm transition-all"
        >
          Cancel
        </Button>
        {isDirty && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 self-center font-medium ml-0 sm:ml-2 mt-1 sm:mt-0">
            You have unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}
