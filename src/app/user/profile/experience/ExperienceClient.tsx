"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  FolderOpen,
  Save,
  X,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Github,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

// Redux imports
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { useIsDirty } from "@/redux/hooks";
import {
  updateUserProfile,
  fetchUserProfile,
  updateExperience,
  addProject,
  updateProject,
  removeProject,
  addInternship,
  updateInternship,
  removeInternship,
  UserProfileData,
} from "@/redux/slice/user.slice";
import { useProfileBootstrap } from "@/hooks/useProfileBootstrap";

const EXPERIENCE_LEVELS = [
  { value: "fresher", label: "Fresher (No experience)" },
  { value: "1-2 years", label: "1-2 years" },
  { value: "2-5 years", label: "2-5 years" },
  { value: "5+ years", label: "5+ years" },
];

const PROJECT_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In Progress" },
  { value: "planned", label: "Planned" },
];

type ExperienceLevel = "fresher" | "1-2 years" | "2-5 years" | "5+ years";
type ProjectStatus = "completed" | "in-progress" | "planned";

type ProjectFormData = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link: string;
  githubLink: string;
  status: ProjectStatus;
};

type InternshipFormData = {
  id: string;
  companyName: string;
  position: string;
  duration: string;
  description: string;
  skills: string[];
};

// Use the Redux types for consistency
type ProjectType = NonNullable<
  UserProfileData["experience"]
>["projects"] extends (infer U)[]
  ? U
  : never;
type InternshipType = NonNullable<
  UserProfileData["experience"]
>["previousInternships"] extends (infer U)[]
  ? U
  : never;

interface ExperienceClientProps {
  initialUser: UserProfileData;
}

export default function ExperienceClient({
  initialUser,
}: ExperienceClientProps) {
  const dispatch = useAppDispatch();
  const { user } = useProfileBootstrap(initialUser);
  const isDirty = useIsDirty();

  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPortalTarget(document.getElementById("profile-actions-portal"));
  }, []);

  // Project form state
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(
    null,
  );
  const [projectForm, setProjectForm] = React.useState<ProjectFormData>({
    id: "",
    title: "",
    description: "",
    technologies: [],
    link: "",
    githubLink: "",
    status: "completed",
  });
  const [newTechnology, setNewTechnology] = React.useState("");

  // Internship form state
  const [isInternshipDialogOpen, setIsInternshipDialogOpen] =
    React.useState(false);
  const [editingInternship, setEditingInternship] = React.useState<
    string | null
  >(null);
  const [internshipForm, setInternshipForm] =
    React.useState<InternshipFormData>({
      id: "",
      companyName: "",
      position: "",
      duration: "",
      description: "",
      skills: [],
    });
  const [newSkill, setNewSkill] = React.useState("");

  // Initialize form data when user loads
  React.useEffect(() => {
    if (user?.experience) {
      setExperienceLevel(user.experience.level || "fresher");
    }
  }, [user]);

  const handleExperienceLevelChange = async (level: string) => {
    setExperienceLevel(level);
    dispatch(updateExperience({ level: level as ExperienceLevel }));

    // Automatically persist the experience level change
    try {
      await dispatch(
        updateUserProfile({
          experience: {
            ...user?.experience,
            level: level as ExperienceLevel,
          },
        }),
      ).unwrap();
    } catch (error) {
      toast.error("Failed to update experience level");
      console.error("Experience level update error:", error);
    }
  };

  // Project handlers
  const openProjectDialog = (project?: ProjectType) => {
    if (project) {
      setEditingProject(project.id);
      setProjectForm({
        id: project.id,
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        link: project.link || "",
        githubLink: project.githubLink || "",
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        id: `project_${Date.now()}`,
        title: "",
        description: "",
        technologies: [],
        link: "",
        githubLink: "",
        status: "completed",
      });
    }
    setIsProjectDialogOpen(true);
  };

  const closeProjectDialog = () => {
    setIsProjectDialogOpen(false);
    setEditingProject(null);
    setProjectForm({
      id: "",
      title: "",
      description: "",
      technologies: [],
      link: "",
      githubLink: "",
      status: "completed",
    });
    setNewTechnology("");
  };

  const handleProjectSubmit = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const originalProjects = user?.experience?.projects || [];

    try {
      if (editingProject) {
        // Update project in Redux state
        dispatch(updateProject({ id: editingProject, updates: projectForm }));

        // Get updated projects array and persist to database
        const updatedProjects = originalProjects.map((p: ProjectType) =>
          p.id === editingProject ? { ...p, ...projectForm } : p,
        );

        await dispatch(
          updateUserProfile({
            experience: {
              ...user?.experience,
              projects:
                updatedProjects as UserProfileData["experience"]["projects"],
            },
          }),
        ).unwrap();

        toast.success("Project updated successfully!");
      } else {
        // Create new project object
        const newProject = {
          ...projectForm,
          addedDate: new Date().toISOString(),
        };

        // Add project to Redux state
        dispatch(addProject(newProject));

        // Get updated projects array and persist to database
        const updatedProjects = [...originalProjects, newProject];

        await dispatch(
          updateUserProfile({
            experience: {
              ...user?.experience,
              projects:
                updatedProjects as UserProfileData["experience"]["projects"],
            },
          }),
        ).unwrap();

        toast.success("Project added successfully!");
      }
      closeProjectDialog();
    } catch (error) {
      // Revert changes on error by refetching user profile
      try {
        await dispatch(fetchUserProfile()).unwrap();
      } catch (fetchError) {
        console.error("Failed to revert state:", fetchError);
      }

      toast.error(
        editingProject ? "Failed to update project" : "Failed to add project",
      );
      console.error("Project operation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project_id: string) => {
    setLoading(true);
    try {
      // Remove project from Redux state
      dispatch(removeProject(project_id));

      // Get updated projects array and persist to database
      const updatedProjects =
        user?.experience?.projects?.filter(
          (p: ProjectType) => p.id !== project_id,
        ) || [];

      await dispatch(
        updateUserProfile({
          experience: {
            ...user?.experience,
            projects:
              updatedProjects as UserProfileData["experience"]["projects"],
          },
        }),
      ).unwrap();

      toast.success("Project deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete project");
      console.error("Delete project error:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTechnology = () => {
    if (
      newTechnology.trim() &&
      !projectForm.technologies.includes(newTechnology.trim())
    ) {
      setProjectForm((prev) => ({
        ...prev,
        technologies: [...prev.technologies, newTechnology.trim()],
      }));
      setNewTechnology("");
    }
  };

  const removeTechnology = (tech: string) => {
    setProjectForm((prev) => ({
      ...prev,
      technologies: prev.technologies.filter((t) => t !== tech),
    }));
  };

  // Internship handlers
  const openInternshipDialog = (internship?: InternshipType) => {
    if (internship) {
      setEditingInternship(internship.id);
      setInternshipForm({
        id: internship.id,
        companyName: internship.companyName,
        position: internship.position,
        duration: internship.duration,
        description: internship.description || "",
        skills: internship.skills || [],
      });
    } else {
      setEditingInternship(null);
      setInternshipForm({
        id: `internship_${Date.now()}`,
        companyName: "",
        position: "",
        duration: "",
        description: "",
        skills: [],
      });
    }
    setIsInternshipDialogOpen(true);
  };

  const closeInternshipDialog = () => {
    setIsInternshipDialogOpen(false);
    setEditingInternship(null);
    setInternshipForm({
      id: "",
      companyName: "",
      position: "",
      duration: "",
      description: "",
      skills: [],
    });
    setNewSkill("");
  };

  const handleInternshipSubmit = async () => {
    if (
      !internshipForm.companyName.trim() ||
      !internshipForm.position.trim() ||
      !internshipForm.duration.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const originalInternships = user?.experience?.previousInternships || [];

    try {
      if (editingInternship) {
        // Update internship in Redux state
        dispatch(
          updateInternship({ id: editingInternship, updates: internshipForm }),
        );

        // Get updated internships array and persist to database
        const updatedInternships = originalInternships.map(
          (i: InternshipType) =>
            i.id === editingInternship ? { ...i, ...internshipForm } : i,
        );

        await dispatch(
          updateUserProfile({
            experience: {
              ...user?.experience,
              previousInternships:
                updatedInternships as UserProfileData["experience"]["previousInternships"],
            },
          }),
        ).unwrap();

        toast.success("Internship updated successfully!");
      } else {
        // Create new internship object
        const newInternship = {
          ...internshipForm,
          addedDate: new Date().toISOString(),
        };

        // Add internship to Redux state
        dispatch(addInternship(newInternship));

        // Get updated internships array and persist to database
        const updatedInternships = [...originalInternships, newInternship];

        await dispatch(
          updateUserProfile({
            experience: {
              ...user?.experience,
              previousInternships:
                updatedInternships as UserProfileData["experience"]["previousInternships"],
            },
          }),
        ).unwrap();

        toast.success("Internship added successfully!");
      }
      closeInternshipDialog();
    } catch (error) {
      // Revert changes on error by refetching user profile
      try {
        await dispatch(fetchUserProfile()).unwrap();
      } catch (fetchError) {
        console.error("Failed to revert state:", fetchError);
      }

      toast.error(
        editingInternship
          ? "Failed to update internship"
          : "Failed to add internship",
      );
      console.error("Internship operation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInternship = async (internshipId: string) => {
    setLoading(true);
    try {
      // Remove internship from Redux state
      dispatch(removeInternship(internshipId));

      // Get updated internships array and persist to database
      const updatedInternships =
        user?.experience?.previousInternships?.filter(
          (i: InternshipType) => i.id !== internshipId,
        ) || [];

      await dispatch(
        updateUserProfile({
          experience: {
            ...user?.experience,
            previousInternships:
              updatedInternships as UserProfileData["experience"]["previousInternships"],
          },
        }),
      ).unwrap();

      toast.success("Internship deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete internship");
      console.error("Delete internship error:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !internshipForm.skills.includes(newSkill.trim())) {
      setInternshipForm((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setInternshipForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Prepare the complete experience object with all current data from Redux state
      const experienceData = {
        level: experienceLevel as ExperienceLevel,
        projects: user?.experience?.projects || [],
        previousInternships: user?.experience?.previousInternships || [],
      };

      // Dispatch the complete experience data to ensure all changes are persisted
      await dispatch(
        updateUserProfile({ experience: experienceData }),
      ).unwrap();

      toast.success("Experience updated successfully!");
    } catch (error) {
      toast.error("Failed to update experience");
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── EXPERIENCE LEVEL ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-850/50 pb-3">
          <Briefcase className="h-5 w-5 text-zinc-700 dark:text-zinc-350" />
          <h3 className="text-sm font-semibold">Experience Level</h3>
        </div>
        
        <div className="space-y-1.5 md:w-1/2">
          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-350">Current Experience Level</Label>
          <Select
            value={experienceLevel}
            onValueChange={handleExperienceLevelChange}
          >
            <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5 focus-visible:ring-primary/20">
              <SelectValue placeholder="Select your experience level" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-850 shadow-md rounded-xl">
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value} className="text-xs rounded-lg cursor-pointer">
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── NOTABLE PROJECTS ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-850/50 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-zinc-700 dark:text-zinc-350" />
            <h3 className="text-sm font-semibold">Notable Projects</h3>
          </div>
          <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-1.5 h-8.5 rounded-xl border-zinc-200 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200 text-xs font-semibold px-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
                variant="outline"
                onClick={() => openProjectDialog()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-2xl shadow-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold tracking-wide uppercase text-zinc-900 dark:text-zinc-50">
                  {editingProject ? "Edit Project" : "Add New Project"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Project Title *</Label>
                    <Input
                      id="title"
                      value={projectForm.title}
                      onChange={(e) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g., E-commerce Platform"
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          status: value as ProjectStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-250/60 shadow-md rounded-xl">
                        {PROJECT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value} className="text-xs rounded-lg cursor-pointer">
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description *</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Describe what the project does and your role in it..."
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm p-3.5 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="link" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Live Demo URL</Label>
                    <Input
                      id="link"
                      value={projectForm.link}
                      onChange={(e) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          link: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="githubLink" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">GitHub Repository</Label>
                    <Input
                      id="githubLink"
                      value={projectForm.githubLink}
                      onChange={(e) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          githubLink: e.target.value,
                        }))
                      }
                      placeholder="https://github.com/..."
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Technologies Used</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTechnology}
                      onChange={(e) => setNewTechnology(e.target.value)}
                      placeholder="Add technology"
                      onKeyDown={(e) => e.key === "Enter" && addTechnology()}
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5 flex-1"
                    />
                    <Button
                      className="cursor-pointer bg-zinc-950 text-white rounded-xl h-10 px-4"
                      type="button"
                      onClick={addTechnology}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {projectForm.technologies.map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className="gap-1 px-2.5 py-0.5 rounded-lg text-xs border border-zinc-200/50 bg-zinc-50 text-zinc-800 font-medium"
                      >
                        {tech}
                        <button
                          type="button"
                          className="h-4 w-4 p-0 text-zinc-400 hover:text-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-100"
                          onClick={() => removeTechnology(tech)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button
                  className="cursor-pointer border-zinc-200 rounded-xl"
                  variant="outline"
                  onClick={closeProjectDialog}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  className="cursor-pointer bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl px-5"
                  onClick={handleProjectSubmit}
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingProject ? "Update Project" : "Add Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {user?.experience?.projects && user.experience.projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {user.experience.projects.map((project) => (
              <div
                key={project.id}
                className="border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4.5 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/10 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">{project.title}</h4>
                      <Badge
                        variant={
                          project.status === "completed"
                            ? "default"
                            : project.status === "in-progress"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[9px] px-1.5 py-0.5 rounded-md font-medium tracking-wide uppercase"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    
                    {/* Project actions */}
                    <div className="flex items-center gap-1">
                      {project.link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
                          onClick={() => window.open(project.link, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {project.githubLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
                          onClick={() => window.open(project.githubLink, "_blank")}
                        >
                          <Github className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
                        onClick={() =>
                          openProjectDialog({
                            ...project,
                            addedDate:
                              typeof project.addedDate === "string"
                                ? project.addedDate
                                : project.addedDate.toISOString(),
                          } as ProjectType)
                        }
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-zinc-450 hover:text-red-500 cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-2xl p-6 max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Delete Project</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-zinc-500">
                              Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4 gap-2">
                            <AlertDialogCancel className="rounded-xl border-zinc-200 text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProject(project.id)}
                              className="rounded-xl bg-red-600 hover:bg-red-550 text-white text-xs"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    {project.description}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2 mt-auto">
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="text-[9px] font-medium text-zinc-500 border-zinc-200 px-1.5 py-0.5 rounded-md"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    <span>Added {new Date(project.addedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20">
            <FolderOpen className="h-10 w-10 text-zinc-300 mx-auto mb-2.5" />
            <p className="text-xs text-zinc-400 font-medium">
              No projects added yet. Click &quot;Add Project&quot; to get started.
            </p>
          </div>
        )}
      </motion.div>

      <hr className="border-zinc-100 dark:border-zinc-850/50" />

      {/* ── PREVIOUS INTERNSHIPS ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-850/50 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-zinc-700 dark:text-zinc-350" />
            <h3 className="text-sm font-semibold">Previous Internships</h3>
          </div>
          <Dialog open={isInternshipDialogOpen} onOpenChange={setIsInternshipDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-1.5 h-8.5 rounded-xl border-zinc-200 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200 text-xs font-semibold px-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
                variant="outline"
                onClick={() => openInternshipDialog()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Internship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-2xl shadow-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold tracking-wide uppercase text-zinc-900 dark:text-zinc-50">
                  {editingInternship ? "Edit Internship" : "Add New Internship"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={internshipForm.companyName}
                      onChange={(e) =>
                        setInternshipForm((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      placeholder="e.g., Tech Corp"
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="position" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Position *</Label>
                    <Input
                      id="position"
                      value={internshipForm.position}
                      onChange={(e) =>
                        setInternshipForm((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      placeholder="e.g., Software Development Intern"
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Duration *</Label>
                  <Input
                    id="duration"
                    value={internshipForm.duration}
                    onChange={(e) =>
                      setInternshipForm((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    placeholder="e.g., 3 months (Jun 2024 - Aug 2024)"
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</Label>
                  <Textarea
                    id="description"
                    value={internshipForm.description}
                    onChange={(e) =>
                      setInternshipForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Describe your responsibilities and achievements..."
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm p-3.5 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Skills Gained</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add skill"
                      onKeyDown={(e) => e.key === "Enter" && addSkill()}
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-10 px-3.5 flex-1"
                    />
                    <Button
                      className="cursor-pointer bg-zinc-950 text-white rounded-xl h-10 px-4"
                      type="button"
                      onClick={addSkill}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {internshipForm.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 px-2.5 py-0.5 rounded-lg text-xs border border-zinc-200/50 bg-zinc-55 text-zinc-800 font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          className="h-4 w-4 p-0 text-zinc-400 hover:text-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-100"
                          onClick={() => removeSkill(skill)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={closeInternshipDialog}
                  disabled={loading}
                  className="rounded-xl border-zinc-200"
                >
                  Cancel
                </Button>
                <Button
                  className="cursor-pointer bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl px-5"
                  onClick={handleInternshipSubmit}
                  disabled={loading}
                >
                  {loading ? "Saving..." : editingInternship ? "Update Internship" : "Add Internship"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {user?.experience?.previousInternships && user.experience.previousInternships.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {user.experience.previousInternships.map((internship) => (
              <div
                key={internship.id}
                className="border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4.5 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/10 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{internship.position}</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-450 font-semibold uppercase tracking-wide mt-0.5">
                        {internship.companyName} • {internship.duration}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
                        onClick={() =>
                          openInternshipDialog({
                            ...internship,
                            addedDate:
                              typeof internship.addedDate === "string"
                                ? internship.addedDate
                                : internship.addedDate.toISOString(),
                          } as InternshipType)
                        }
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-zinc-450 hover:text-red-500 cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-2xl p-6 max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Delete Internship</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-zinc-500">
                              Are you sure you want to delete this internship at &quot;{internship.companyName}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4 gap-2">
                            <AlertDialogCancel className="rounded-xl border-zinc-200 text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInternship(internship.id)}
                              className="rounded-xl bg-red-600 hover:bg-red-550 text-white text-xs"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {internship.description && (
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium pt-1">
                      {internship.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col gap-2 mt-auto">
                  {internship.skills && internship.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {internship.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-[9px] font-medium text-zinc-505 border-zinc-200 px-1.5 py-0.5 rounded-md"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    <span>Added {new Date(internship.addedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20">
            <Briefcase className="h-10 w-10 text-zinc-300 mx-auto mb-2.5" />
            <p className="text-xs text-zinc-400 font-medium">
              No internships added yet. Click &quot;Add Internship&quot; to get started.
            </p>
          </div>
        )}
      </motion.div>

      {/* ── ACTION BUTTONS ──────────────────────────────────────────── */}
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
        {isDirty && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 self-center font-medium ml-0 sm:ml-2">
            You have unsaved changes.
          </p>
        )}
      </div>
    </div>
  );
}