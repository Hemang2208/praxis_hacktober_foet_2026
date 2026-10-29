"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotesStore } from "@/lib/store";

interface NotesPanelProps {
  sectionId: string;
}

export function NotesPanel({ sectionId }: NotesPanelProps) {
  const { getNotesBySectionId, addNote, updateNote, deleteNote } =
    useNotesStore();
  const notes = getNotesBySectionId(sectionId);

  const [newNoteBody, setNewNoteBody] = React.useState("");
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingBody, setEditingBody] = React.useState("");
  const [isAddingNote, setIsAddingNote] = React.useState(false);

  const handleAddNote = React.useCallback(() => {
    if (newNoteBody.trim()) {
      addNote(sectionId, newNoteBody.trim());
      setNewNoteBody("");
      setIsAddingNote(false);
    }
  }, [addNote, newNoteBody, sectionId]);

  const handleEditNote = (noteId: string, currentBody: string) => {
    setEditingNoteId(noteId);
    setEditingBody(currentBody);
  };

  const handleSaveEdit = React.useCallback(() => {
    if (editingNoteId && editingBody.trim()) {
      updateNote(editingNoteId, editingBody.trim());
      setEditingNoteId(null);
      setEditingBody("");
    }
  }, [editingNoteId, editingBody, updateNote]);

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingBody("");
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
  };

  // Auto-save functionality with Cmd+S
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editingNoteId) {
          handleSaveEdit();
        } else if (isAddingNote && newNoteBody.trim()) {
          handleAddNote();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingNoteId, isAddingNote, newNoteBody, handleAddNote, handleSaveEdit]);

  return (
    <div className="space-y-4 mt-6">
      {/* Add Note Button */}
      {!isAddingNote && (
        <Button
          onClick={() => setIsAddingNote(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      )}

      {/* Add Note Form */}
      {isAddingNote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Textarea
            placeholder="Write your note here... (Cmd/Ctrl + S to save)"
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
            onBlur={handleAddNote}
            className="min-h-[100px]"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAddNote}
              size="sm"
              disabled={!newNoteBody.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteBody("");
              }}
              variant="outline"
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No notes yet. Add your first note to get started!</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-500">
                      {new Date(note.created_at).toLocaleDateString()} at{" "}
                      {new Date(note.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditNote(note.id, note.body)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNote(note.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        onBlur={handleSaveEdit}
                        className="min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveEdit}
                          size="sm"
                          disabled={!editingBody.trim()}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {note.body}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
