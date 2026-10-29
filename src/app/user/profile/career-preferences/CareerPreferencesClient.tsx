"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Redux imports
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { useIsDirty } from "@/redux/hooks";
import {
  updateUserProfile,
  updateCareerGoals,
  setDirty,
  UserProfileData,
} from "@/redux/slice/user.slice";
import { useProfileBootstrap } from "@/hooks/useProfileBootstrap";

interface CareerPreferencesClientProps {
  initialUser: UserProfileData;
}

export default function CareerPreferencesClient({
  initialUser,
}: CareerPreferencesClientProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.userProfile);
  const isDirty = useIsDirty();
  const { user: profileUser, lastUpdated } = useProfileBootstrap(initialUser);
  const liveUser = user ?? profileUser;

  const [loading, setLoading] = useState(false);
  const [careerGoals, setCareerGoals] = useState("");

  useEffect(() => {
    if (liveUser?.careerGoals && !isDirty) {
      setCareerGoals(liveUser.careerGoals.careerObjective || "");
    }
  }, [liveUser, lastUpdated, isDirty]);

  const handleCareerGoalsChange = (value: string) => {
    setCareerGoals(value);
    dispatch(updateCareerGoals({ careerObjective: value }));
    dispatch(setDirty(true));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await dispatch(
        updateUserProfile({
          careerGoals: {
            careerObjective: careerGoals,
          },
        })
      ).unwrap();
      toast.success("Career preferences updated successfully!");
      dispatch(setDirty(false));
    } catch (error) {
      toast.error("Failed to update career preferences");
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (liveUser?.careerGoals) {
      setCareerGoals(liveUser.careerGoals.careerObjective || "");
    }
    dispatch(setDirty(false));
  };

  return (
    <div className="space-y-6">
      {/* Career Goals Section (clean and borderless layout block) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-850/50 pb-3">
          <Target className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          <h3 className="text-sm font-semibold">Career Goals</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="careerGoals" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              What are your career aspirations?
            </Label>
            <Textarea
              id="careerGoals"
              value={careerGoals}
              onChange={(e) => handleCareerGoalsChange(e.target.value)}
              rows={8}
              placeholder="Describe your career goals, desired roles, industries you're interested in, and what you hope to achieve in your professional journey..."
              className="rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm p-3.5 resize-none leading-relaxed"
            />
          </div>
        </div>
      </motion.div>

      {/* Action Buttons rendered inline at the bottom */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-850/50 mt-6 w-full">
        <Button
          onClick={handleSave}
          disabled={!isDirty || loading}
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
          onClick={handleCancel}
          variant="outline"
          disabled={!isDirty || loading}
          className="gap-2 cursor-pointer border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 rounded-xl font-semibold px-6 py-2.5 h-10 w-full sm:w-auto text-sm transition-all"
        >
          Cancel
        </Button>
        {isDirty && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 self-center font-medium ml-0 sm:ml-2">
            You have unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}
