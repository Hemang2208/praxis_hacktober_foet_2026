"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Project } from "@/redux/slice/project.slice";
import {
  getAssignableResourceRoles,
  normalizeEmail,
  normalizeRoleKey,
} from "@/lib/project-member-rules";

type DialogTab = "existing" | "new";

export type CreateRoleInput = {
  profile: string;
  skills: string[];
  experience: string;
  description: string;
};

export type AssignMemberInput = {
  email: string;
  roleProfile: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  trigger?: React.ReactNode;
  addingMember: boolean;
  creatingRole: boolean;
  onAssignMember: (input: AssignMemberInput) => Promise<void>;
  onCreateRole: (input: CreateRoleInput) => Promise<void>;
  validateEmailForProject?: (email: string) => Promise<boolean>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProjectMemberManagementDialog({
  open,
  onOpenChange,
  project,
  trigger,
  addingMember,
  creatingRole,
  onAssignMember,
  onCreateRole,
  validateEmailForProject,
}: Props) {
  const [tab, setTab] = useState<DialogTab>("existing");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [newRoleProfile, setNewRoleProfile] = useState("");
  const [newRoleSkills, setNewRoleSkills] = useState("");
  const [newRoleExperience, setNewRoleExperience] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const assignableRoles = useMemo(
    () => getAssignableResourceRoles(project),
    [project],
  );

  useEffect(() => {
    if (!open) return;

    if (assignableRoles.length > 0) {
      setTab("existing");
      return;
    }

    setTab("new");
    setSelectedResourceId("");
  }, [open, assignableRoles.length]);

  useEffect(() => {
    if (!open || !validateEmailForProject) return;

    const trimmed = normalizeEmail(newMemberEmail);
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setEmailExists(null);
      setCheckingEmail(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const exists = await validateEmailForProject(trimmed);
        if (!cancelled) setEmailExists(Boolean(exists));
      } catch {
        if (!cancelled) setEmailExists(null);
      } finally {
        if (!cancelled) setCheckingEmail(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, newMemberEmail, validateEmailForProject]);

  const closeAndReset = () => {
    onOpenChange(false);
    setTab("existing");
    setSelectedResourceId("");
    setNewMemberEmail("");
    setEmailExists(null);
    setCheckingEmail(false);
    setNewRoleProfile("");
    setNewRoleSkills("");
    setNewRoleExperience("");
    setNewRoleDescription("");
  };

  const handleCreateRole = async () => {
    const profile = String(newRoleProfile).trim();
    if (!profile) return;

    await onCreateRole({
      profile,
      skills: newRoleSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      experience: String(newRoleExperience).trim(),
      description: String(newRoleDescription).trim(),
    });

    setSelectedResourceId(profile);
    setTab("existing");
    setNewRoleProfile("");
    setNewRoleSkills("");
    setNewRoleExperience("");
    setNewRoleDescription("");
  };

  const handleAssignMember = async () => {
    const email = normalizeEmail(newMemberEmail);
    const roleProfile = String(selectedResourceId).trim();
    if (!email || !roleProfile) return;

    await onAssignMember({ email, roleProfile });

    setNewMemberEmail("");
    setSelectedResourceId("");
    setEmailExists(null);
    onOpenChange(false);
  };

  const canAssign =
    !addingMember &&
    !creatingRole &&
    tab === "existing" &&
    Boolean(selectedResourceId) &&
    EMAIL_REGEX.test(normalizeEmail(newMemberEmail)) &&
    (validateEmailForProject ? emailExists === true : true);

  const roleAlreadyExists = useMemo(() => {
    const role = normalizeRoleKey(newRoleProfile);
    if (!role) return false;
    return (project?.resources || []).some(
      (resource) => normalizeRoleKey(resource?.profile) === role,
    );
  }, [newRoleProfile, project?.resources]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Team Members & Roles</DialogTitle>
          <DialogDescription>
            Assign members to existing roles or create new roles for this
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab("existing")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              tab === "existing"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Assign to Existing Role
          </button>
          <button
            onClick={() => setTab("new")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              tab === "new"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create New Role
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {tab === "existing" ? (
            <>
              <div>
                <Label htmlFor="member-role">Available Role</Label>
                {assignableRoles.length > 0 ? (
                  <select
                    id="member-role"
                    aria-label="Select available role"
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                  >
                    <option value="">Select a role...</option>
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      No assignable roles are currently available. Create a new
                      role first.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="member-email">Member Email</Label>
                <Input
                  id="member-email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="member@example.com"
                  disabled={!selectedResourceId}
                />
                <p className="mt-1 text-sm">
                  {checkingEmail ? (
                    <span className="text-slate-500">Checking...</span>
                  ) : emailExists === true ? (
                    <span className="text-emerald-600">
                      Member exists in system
                    </span>
                  ) : emailExists === false ? (
                    <span className="text-red-600">
                      Member not found or cannot be assigned
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      {selectedResourceId
                        ? "Enter a valid email to check"
                        : "Select a role first"}
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="new-role-profile">Role Name *</Label>
                <Input
                  id="new-role-profile"
                  value={newRoleProfile}
                  onChange={(e) => setNewRoleProfile(e.target.value)}
                  placeholder="e.g., Frontend Developer, Product Manager"
                />
                {roleAlreadyExists ? (
                  <p className="text-xs text-red-600 mt-1">
                    This role already exists in project requirements.
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="new-role-skills">Required Skills</Label>
                <Input
                  id="new-role-skills"
                  value={newRoleSkills}
                  onChange={(e) => setNewRoleSkills(e.target.value)}
                  placeholder="React, TypeScript, CSS"
                />
              </div>

              <div>
                <Label htmlFor="new-role-experience">Experience Level</Label>
                <Input
                  id="new-role-experience"
                  value={newRoleExperience}
                  onChange={(e) => setNewRoleExperience(e.target.value)}
                  placeholder="1-3 years"
                />
              </div>

              <div>
                <Label htmlFor="new-role-description">Role Description</Label>
                <Textarea
                  id="new-role-description"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe this role"
                  rows={3}
                />
              </div>

              <Button
                type="button"
                onClick={handleCreateRole}
                disabled={
                  creatingRole || !newRoleProfile.trim() || roleAlreadyExists
                }
                className="w-full"
                variant="outline"
              >
                {creatingRole ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Role"
                )}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeAndReset}
            disabled={addingMember || creatingRole}
          >
            Cancel
          </Button>
          <Button onClick={handleAssignMember} disabled={!canAssign}>
            {addingMember ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Adding...
              </>
            ) : (
              "Assign Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
