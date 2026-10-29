"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { encrypt } from "@/lib/crypto";
import { DatePicker } from "@/components/ui/date-picker";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface NewProjectDialogProps {
  isNewProjectOpen: boolean;
  setIsNewProjectOpen: (isNewProjectOpen: boolean) => void;
  onProjectCreated?: () => void;
}

export default function NewProjectDialog({ isNewProjectOpen, setIsNewProjectOpen, onProjectCreated }: NewProjectDialogProps) {
    const [step, setStep] = useState(1);

    const [newProject, setNewProject] = useState({
        title: "",
        description: "",
        deadline: "",
        tags: "",
        document: "",
        resources: [],
    });

    const [resourceInput, setResourceInput] = useState<{
        profile?: string;
        skills?: string;
        experience?: string;
        description?: string;
        type?: 'Full-time' | "Internship" | 'Part-time' | 'Contract' | '';
    }>({});

    const handleNext = () => setStep((s) => Math.min(s + 1, 3));
    const handleBack = () => setStep((s) => Math.max(s - 1, 1));

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
            const payload = {
                title: encrypt(newProject.title),
                description: encrypt(newProject.description),
                deadline: encrypt(newProject.deadline),
                tags: encrypt(newProject.tags),
                document: encrypt(newProject.document),
                resources: newProject.resources.map((res) => ({
                    profile: encrypt(res.profile),
                    skills: encrypt(res.skills.join(",")),
                    experience: encrypt(res.experience),
                    description: encrypt(res.description),
                    type: encrypt(res.type),
                })),
            };

            const response = await fetch("/api/project", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("API Error:", data.error);
                alert(`❌ Failed: ${data.error}`);
                return;
            }

            console.log("✅ Project Created:", data.project);
            alert("✅ Project created successfully!");

            // Reset state and close dialog
            setNewProject({
                title: "",
                description: "",
                deadline: "",
                tags: "",
                document: "",
                resources: [],
            });
            setStep(1);
            setIsNewProjectOpen(false);
            
            // Call the callback to refresh the projects list
            if (onProjectCreated) {
                onProjectCreated();
            }
        } catch (err) {
            console.error("Submission Error:", err);
            alert("❌ Something went wrong while submitting the project.");
        }
    };

    return (
        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Step {step} of 3 — Fill in the project details.
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Overview */}
                {step === 1 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Project Title</Label>
                            <Input
                                id="title"
                                placeholder="Enter project title"
                                value={newProject.title}
                                onChange={(e) =>
                                    setNewProject({ ...newProject, title: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your project"
                                value={newProject.description}
                                onChange={(e) =>
                                    setNewProject({ ...newProject, description: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <DatePicker
                                value={newProject.deadline}
                                onChange={(val) =>
                                    setNewProject({ ...newProject, deadline: val })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tags">Tags (comma-separated)</Label>
                            <Input
                                id="tags"
                                placeholder="React, TypeScript, Node.js"
                                value={newProject.tags}
                                onChange={(e) =>
                                    setNewProject({ ...newProject, tags: e.target.value })
                                }
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
                        <Label htmlFor="document">Project Document (Markdown Supported)</Label>
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
                                        setResourceInput({ ...resourceInput, profile: e.target.value })
                                    }
                                />
                                <Input
                                    placeholder="Skills (comma-separated e.g., React, Tailwind)"
                                    value={resourceInput.skills || ""}
                                    onChange={(e) =>
                                        setResourceInput({ ...resourceInput, skills: e.target.value })
                                    }
                                />
                                <Input
                                    placeholder="Experience Required (e.g., 1-2 years)"
                                    value={resourceInput.experience || ""}
                                    onChange={(e) =>
                                        setResourceInput({ ...resourceInput, experience: e.target.value })
                                    }
                                />
                                <Textarea
                                    placeholder="Job Description"
                                    value={resourceInput.description || ""}
                                    onChange={(e) =>
                                        setResourceInput({ ...resourceInput, description: e.target.value })
                                    }
                                />
                                <select
                                    className="border rounded p-2"
                                    aria-label="Resource type"
                                    value={resourceInput.type || ""}
                                    onChange={(e) =>
                                        setResourceInput({ ...resourceInput, type: e.target.value as 'Full-time' | "Internship" | 'Part-time' | 'Contract' | '' })
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
                                            setNewProject((prev) => ({
                                                ...prev,
                                                resources: [
                                                    ...prev.resources,
                                                    {
                                                        ...resourceInput,
                                                        skills: resourceInput.skills
                                                            ?.split(",")
                                                            .map((s) => s.trim()) || [],
                                                    },
                                                ],
                                            }));
                                            setResourceInput({});
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
                                                        resources: prev.resources.filter((_, i) => i !== index),
                                                    }))
                                                }
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                        {/* <div><b>Type:</b> {res.type}</div>
                                        <div><b>Experience:</b> {res.experience}</div> */}
                                        <div><b>Skills:</b> {res.skills.join(", ")}</div>
                                        {/* <div><b>Description:</b> {res.description}</div> */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {/* Footer Navigation */}
                <DialogFooter className="flex justify-between items-center">
                    {step > 1 && (
                        <Button variant="outline" onClick={handleBack}>
                            Back
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button onClick={handleNext}>Next</Button>
                    ) : (
                        <Button onClick={handleCreateProject}>Create Project</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
