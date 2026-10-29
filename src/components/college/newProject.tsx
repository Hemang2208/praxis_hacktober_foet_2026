"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
import { useRef } from "react";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { createProject, updateProject } from "@/redux/slice/project.slice";
import type { CreateProjectPayload } from "@/redux/slice/project.slice";
import { DatePicker } from "@/components/ui/date-picker";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface NewProjectDialogProps {
  isNewProjectOpen: boolean;
  setIsNewProjectOpen: (isNewProjectOpen: boolean) => void;
  onProjectCreated?: () => void;
}

export default function NewProjectDialog({
  isNewProjectOpen,
  setIsNewProjectOpen,
  onProjectCreated,
}: NewProjectDialogProps) {
  const [step, setStep] = useState(1);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [showChevron, setShowChevron] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.project);
  const { userProfile } = useSelector((state: RootState) => state.user);

  const [newProject, setNewProject] = useState<CreateProjectPayload>({
    title: "",
    description: "",
    deadline: "",
    tags: [],
    document: "",
    status: "planning",
    progress: 0,
    tasks: [],
    team: [],
    sprints: [],
    timeline: [],
    resources: [],
    user: "", // This should be set from current user context
    created_by: "", // Will be set from current user on project creation
  });

  const [tagsInput, setTagsInput] = useState("");

  const [resourceInput, setResourceInput] = useState({
    profile: "",
    skills: "",
    experience: "",
    description: "",
    type: "",
    avatar: "",
    username: "",
    name: "",
    user: "",
  });

  const [teamMemberInput, setTeamMemberInput] = useState({
    email: "",
    role: "",
  });
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkedUser, setCheckedUser] = useState<{
    full_name?: string;
    email?: string;
    profile_picture?: string;
    image_url?: string;
  } | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Debounced email existence check (similar to project page behavior)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = async (email: string) => {
      if (!email) {
        setEmailExists(null);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailExists(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/user/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          setEmailExists(true);
          setCheckedUser(json.user || null);
        } else if (res.status === 404) {
          setEmailExists(false);
          setCheckedUser(null);
        } else {
          setEmailExists(null);
          setCheckedUser(null);
        }
      } catch (e) {
        console.error("Email check failed:", e);
        setEmailExists(null);
        setCheckedUser(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    timer = setTimeout(() => check(teamMemberInput.email.trim()), 550);

    return () => {
      if (timer) clearTimeout(timer!);
    };
  }, [teamMemberInput.email]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  // Detect overflow and scroll position to show/hide chevron
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const check = () => {
      const isOverflowing = el.scrollHeight > el.clientHeight + 2; // small tolerance
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      setShowChevron(isOverflowing && !atBottom);
    };

    check();

    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [step, isNewProjectOpen]);

  // const addResource = () => {
  //     if (resourceInput.trim()) {
  //         setNewProject((prev: any) => ({
  //             ...prev,
  //             resources: [...prev.resources, resourceInput.trim()] as string[],
  //         }));
  //         setResourceInput("");
  //     }
  // };

  // const removeResource = (index: number) => {
  //     setNewProject((prev) => ({
  //         ...prev,
  //         resources: prev.resources.filter((_, i) => i !== index),
  //     }));
  // };

  // const handleCreateProject = () => {
  //     console.log("Final Project Data:", newProject);
  //     setIsNewProjectOpen(false);
  // };

  const handleCreateProject = async () => {
    try {
      // Get user ID from Redux store
      const user_id = userProfile?._id;

      if (!user_id) {
        toast.error("User not authenticated. Please log in again.");
        return;
      }

      const projectPayload: CreateProjectPayload = {
        ...newProject,
        user: user_id.toString(),
        created_by: user_id.toString(),
      };

      // Capture members to invite before we reset state
      const membersToInvite = newProject.team ? [...newProject.team] : [];

      // Dispatch the createProject action
      const result = await dispatch(createProject(projectPayload)).unwrap();

      console.log("✅ Project Created:", result.project);
      toast.success("Project created successfully!");

      // --- Create ResultReleaseCycle entry ---
      try {
        const project_id = result.project?.project_id || result.project?._id;
        const projectTitle = result.project?.title;
        console.log(
          "Debug: project_id, user_id, projectTitle",
          project_id,
          user_id,
          projectTitle,
        );
        if (project_id && user_id && projectTitle) {
          console.log("About to call /api/result-release-cycles", {
            project_id,
            user_id,
            projectTitle,
          });
          const res = await fetch("/api/result-release-cycles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              project_id,
              user_id: user_id.toString(),
              projectTitle,
            }),
          });
          const data = await res.json().catch(() => ({}));
          console.log("ResultReleaseCycle API response:", data);
        }
      } catch (err) {
        console.error("Failed to create ResultReleaseCycle entry:", err);
      }

      // Reset state and close dialog
      setNewProject({
        title: "",
        description: "",
        deadline: "",
        tags: [],
        document: "",
        status: "planning",
        progress: 0,
        tasks: [],
        team: [],
        sprints: [],
        timeline: [],
        resources: [],
        user: "",
        created_by: "",
      });
      setTagsInput("");
      setResourceInput({
        profile: "",
        skills: "",
        experience: "",
        description: "",
        type: "",
        avatar: "",
        username: "",
        name: "",
        user: "",
      });
      setStep(1);
      setIsNewProjectOpen(false);

      // Call the callback to refresh the projects list
      // After creating the project, persist the team members into the project record
      try {
        const project_id = result.project?._id || null;
        if (project_id && membersToInvite.length > 0) {
          // Build the team_members array expected by the backend
          const teamMembersPayload = membersToInvite.map((m) => ({
            name: m?.name || (m?.email ? m.email.split("@")[0] : ""),
            email: m?.email || "",
            role: m?.role || "Contributor",
            avatar: m?.avatar || "",
          }));

          try {
            // Use the existing updateProject thunk to persist team_members
            await dispatch(
              updateProject({
                id: project_id,
                updates: { team_members: teamMembersPayload },
              }),
            ).unwrap();
          } catch (uErr) {
            console.error("Failed to update project with team members:", uErr);
          }

          // Now send invites for each member (server-side invite endpoint)
          for (const m of membersToInvite) {
            try {
              if (!m?.email) continue;
              const inviteRes = await fetch(`/api/project/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  project_id,
                  email: m.email,
                  name: m.name,
                  role: m.role,
                }),
              });

              if (inviteRes.ok) {
                toast.success(`Invitation email sent to ${m.email}`);
              } else if (inviteRes.status === 404) {
                toast(
                  `User not found in system; will add by email: ${m.email}`,
                  { icon: "⚠️" },
                );
              } else {
                const json = await inviteRes.json().catch(() => ({}));
                toast.error(
                  json?.message || `Failed to send invite to ${m.email}`,
                );
              }
            } catch (e) {
              console.error("Invite call failed for", m.email, e);
              toast.error(`Failed to send invite to ${m.email}`);
            }
          }
        }
      } catch (e) {
        console.error("Post-create invites failed", e);
      }

      if (onProjectCreated) {
        onProjectCreated();
      }
    } catch (error: unknown) {
      console.error("Project Creation Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`❌ Failed to create project: ${errorMessage}`);
    }
  };

  const isStep1Valid = (newProject.title || "").trim().length >= 6 && (newProject.description || "").trim().length >= 6;

  return (
    <Sheet open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
      <SheetContent className="sm:max-w-[550px] w-full flex flex-col h-full border-l bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-2xl p-6">
        <SheetHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Create New Project</SheetTitle>
          <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-450">
            Step {step} of 4 — Fill in the project details.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body: flex-1 so it grows and becomes scrollable when content overflows */}
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto hide-scrollbar"
        >
          {/* Step 1: Overview */}
          {step === 1 && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Project Title <span className="text-red-500">*</span>
                  </Label>
                  {(newProject.title || "").trim().length > 0 && (newProject.title || "").trim().length < 6 && (
                    <span className="text-[10px] text-red-500 font-medium">Min 6 characters ({newProject.title.trim().length}/6)</span>
                  )}
                </div>
                <Input
                  id="title"
                  placeholder="Enter project title"
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({ ...newProject, title: e.target.value })
                  }
                  className={(newProject.title || "").trim().length > 0 && (newProject.title || "").trim().length < 6 ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  {(newProject.description || "").trim().length > 0 && (newProject.description || "").trim().length < 6 && (
                    <span className="text-[10px] text-red-500 font-medium">Min 6 characters ({newProject.description.trim().length}/6)</span>
                  )}
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe your project"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  className={(newProject.description || "").trim().length > 0 && (newProject.description || "").trim().length < 6 ? "border-red-500 focus-visible:ring-red-500 rounded-xl" : "rounded-xl"}
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Deadline</Label>
                <DatePicker
                  value={newProject.deadline}
                  onChange={(val) =>
                    setNewProject({ ...newProject, deadline: val })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="React, TypeScript, Node.js"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    const tagsArray = e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter((tag) => tag);
                    setNewProject({ ...newProject, tags: tagsArray });
                  }}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Step 2: Project Document */}
          {/* {step === 2 && (
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="document">Project Document / Link</Label>
                        <Textarea
                            id="document"
                            placeholder="Paste drive link, GitHub repo or document description"
                            value={newProject.document}
                            onChange={(e) =>
                                setNewProject({ ...newProject, document: e.target.value })
                            }
                        />
                    </div>
                )} */}
          {step === 2 && (
            <div className="grid gap-4 py-4">
              <Label htmlFor="document">
                Project Document (Markdown Supported)
              </Label>
              <div data-color-mode="light">
                <MDEditor
                  value={newProject.document}
                  onChange={(val) =>
                    setNewProject({ ...newProject, document: val || "" })
                  }
                  preview="edit"
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Step 3: Resources */}
          {/* {step === 3 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="resource">Add Required Resources</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="resource"
                                    placeholder="Frontend Developer, Backend Dev, etc."
                                    value={resourceInput}
                                    onChange={(e) => setResourceInput(e.target.value)}
                                />
                                <Button type="button" onClick={addResource}>
                                    Add
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {newProject.resources.map((res, index) => (
                                <div key={index} className="flex justify-between items-center border p-2 rounded">
                                    <span>{res}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeResource(index)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )} */}
          {step === 3 && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>New Resource Requirement</Label>
                <div className="grid gap-3 p-4 border rounded-md">
                  <Input
                    placeholder="Profile / Role (e.g., Frontend Developer)"
                    value={resourceInput.profile || ""}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        profile: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Skills (comma-separated e.g., React, Tailwind)"
                    value={resourceInput.skills || ""}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        skills: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Experience Required (e.g., 1-2 years)"
                    value={resourceInput.experience || ""}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        experience: e.target.value,
                      })
                    }
                  />
                  <Textarea
                    placeholder="Job Description"
                    value={resourceInput.description || ""}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        description: e.target.value,
                      })
                    }
                  />
                  <select
                    className="border rounded p-2"
                    aria-label="Resource type"
                    value={resourceInput.type || ""}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        type: e.target.value as
                          | "Full-time"
                          | "Internship"
                          | "Part-time"
                          | "Contract"
                          | "",
                      })
                    }
                  >
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                  <Button
                    type="button"
                    onClick={() => {
                      if (resourceInput.profile?.trim()) {
                        const user_id = userProfile?._id?.toString() || "";
                        setNewProject((prev) => ({
                          ...prev,
                          resources: [
                            ...prev.resources,
                            {
                              profile: resourceInput.profile,
                              skills:
                                resourceInput.skills
                                  ?.split(",")
                                  .map((s) => s.trim()) || [],
                              experience: resourceInput.experience,
                              description: resourceInput.description,
                              type: resourceInput.type,
                              avatar: resourceInput.avatar,
                              username: resourceInput.username,
                              name: resourceInput.name,
                              user: user_id, // Set current user ID for resource
                            },
                          ],
                        }));
                        setResourceInput({
                          profile: "",
                          skills: "",
                          experience: "",
                          description: "",
                          type: "",
                          avatar: "",
                          username: "",
                          name: "",
                          user: "",
                        });
                      }
                    }}
                  >
                    Add Resource
                  </Button>
                </div>
              </div>

              {/* Resource List */}
              {newProject.resources.length > 0 && (
                <div className="grid gap-3">
                  <Label className="pt-2">Added Resources</Label>
                  {newProject.resources.map((res, index) => (
                    <div
                      key={index}
                      className="border p-4 rounded-md shadow-sm flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <strong>{res.profile}</strong>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setNewProject((prev) => ({
                              ...prev,
                              resources: prev.resources.filter(
                                (_, i) => i !== index,
                              ),
                            }))
                          }
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      {/* <div><b>Type:</b> {res.type}</div>
                                        <div><b>Experience:</b> {res.experience}</div> */}
                      <div>
                        <b>Skills:</b> {res.skills.join(", ")}
                      </div>
                      {/* <div><b>Description:</b> {res.description}</div> */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Team & Sprints */}
          {step === 4 && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Team Members (Optional)</Label>
                <div className="grid gap-3 p-4 border rounded-md">
                  <Input
                    placeholder="Team Member Email"
                    value={teamMemberInput.email}
                    onChange={(e) =>
                      setTeamMemberInput({
                        ...teamMemberInput,
                        email: e.target.value,
                      })
                    }
                  />
                  <div className="text-sm text-slate-500">
                    {checkingEmail ? (
                      <span>Checking email...</span>
                    ) : emailExists === true ? (
                      <span className="text-emerald-600">User exists</span>
                    ) : emailExists === false ? (
                      <span className="text-amber-600">User not found</span>
                    ) : null}
                  </div>
                  <Input
                    placeholder="Role (Optional)"
                    value={teamMemberInput.role}
                    onChange={(e) =>
                      setTeamMemberInput({
                        ...teamMemberInput,
                        role: e.target.value,
                      })
                    }
                  />
                  <Button
                    type="button"
                    onClick={async () => {
                      const email = teamMemberInput.email.trim();
                      if (!email) return;
                      // require that the email exists in system before adding
                      if (emailExists !== true) {
                        alert(
                          "Please enter a valid existing user email before adding.",
                        );
                        return;
                      }

                      setAddingMember(true);
                      try {
                        // try invite API to fetch server user info (profile pic) and optionally send invite
                        // Prefer user info from the /api/user/check result (checkedUser). If not present, try invite endpoint.
                        let serverUser = checkedUser;
                        if (!serverUser) {
                          try {
                            const inviteRes = await fetch(
                              `/api/project/invite`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  project_id: null,
                                  email,
                                  role: teamMemberInput.role,
                                }),
                              },
                            );
                            if (inviteRes.ok) {
                              const json = await inviteRes
                                .json()
                                .catch(() => ({}));
                              serverUser = json.user || null;
                            }
                          } catch (e) {
                            console.warn("Invite API failed", e);
                          }
                        }

                        setNewProject((prev) => ({
                          ...prev,
                          team: [
                            ...prev.team!,
                            {
                              user: email, // Use email as user identifier for now
                              name:
                                (serverUser &&
                                  (serverUser.full_name ||
                                    serverUser.email?.split("@")[0])) ||
                                email.split("@")[0],
                              email,
                              role: teamMemberInput.role || "Contributor",
                              avatar:
                                (serverUser &&
                                  (serverUser.profile_picture ||
                                    serverUser.image_url)) ||
                                "",
                            },
                          ],
                        }));

                        setTeamMemberInput({ email: "", role: "" });
                      } finally {
                        setAddingMember(false);
                      }
                    }}
                    disabled={addingMember}
                  >
                    {addingMember ? "Adding..." : "Add Team Member"}
                  </Button>
                </div>
              </div>

              {/* Team Members List */}
              {newProject.team && newProject.team.length > 0 && (
                <div className="grid gap-3">
                  <Label>Team Members</Label>
                  {newProject.team.map((member, index) => (
                    <div
                      key={index}
                      className="border p-3 rounded-md flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {member.avatar ? (
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name || member.email || "member"}
                            />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {(member.name || member.email || "?")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.name}</span>
                          {member.email && (
                            <span className="text-sm text-slate-500">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setNewProject((prev) => ({
                            ...prev,
                            team: prev.team?.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2">
                <Label>Project Status</Label>
                <select
                  aria-label="Project Status"
                  className="border rounded p-2"
                  value={newProject.status}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      status: e.target.value as
                        | "planning"
                        | "in-progress"
                        | "completed"
                        | "on-hold",
                    })
                  }
                >
                  <option value="planning">Planning</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Initial Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newProject.progress}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      progress: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Chevron indicator (appears when scrolled content exists below) */}
        <div
          className={"scroll-chevron" + (showChevron ? " show" : "")}
          aria-hidden
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Footer Navigation (sits outside the scrollable area) */}
        <SheetFooter className="flex justify-between items-center bg-background py-3 px-4 border-t shadow-sm rounded-b-lg mt-auto">
          <div className="flex items-center">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="sm:mr-2 rounded-xl"
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center">
            {step < 4 ? (
              <Button 
                onClick={handleNext} 
                className="ml-0 sm:ml-2 rounded-xl"
                disabled={step === 1 && !isStep1Valid}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                className="ml-0 sm:ml-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 font-semibold"
                disabled={loading.createProject || !userProfile?._id}
              >
                {loading.createProject
                  ? "Creating..."
                  : !userProfile?._id
                    ? "User Required"
                    : "Create Project"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
