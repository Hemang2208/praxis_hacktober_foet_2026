"use client";

import * as React from "react";
import {
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  CornerDownRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/formatDate";
import { useAppDispatch, useUser } from "@/redux/hooks";
import {
  addTaskNote,
  updateTaskNote,
  deleteTaskNote,
  type Task,
} from "@/redux/slice/task.slice";
import toast from "react-hot-toast";

interface TaskNotesTabProps {
  task: Task;
}

type NoteAuthor = Task["notes"][0]["author"] & {
  user_id?: string;
  email?: string;
};

type NoteRec = Task["notes"][0] & {
  _key: string;
  _idStr: string;
  _parentId: string | null;
  _created_atMs: number;
};

export function TaskNotesTab({ task }: TaskNotesTabProps) {
  const dispatch = useAppDispatch();
  const [newNote, setNewNote] = React.useState("");
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<NoteRec | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const { user } = useUser();
  const currentUserId = user?._id ? String(user._id) : null;
  const currentUserEmail = user?.email
    ? String(user.email).toLowerCase()
    : null;

  const handleAddNote = async () => {
    if (!newNote.trim() || !task._id) return;

    setIsAdding(true);
    try {
      await dispatch(
        addTaskNote({
          task_id: task._id,
          content: newNote,
          parent_id: null,
        }),
      ).unwrap();
      setNewNote("");
      toast.success("Note added successfully");
    } catch (error) {
      toast.error("Failed to add note");
      console.error("Error adding note:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartReply = (noteId: string) => {
    setReplyingToId(noteId);
    setReplyContent("");
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
  };

  const handleSubmitReply = async (parent_id: string) => {
    if (!replyContent.trim() || !task._id) return;

    try {
      await dispatch(
        addTaskNote({
          task_id: task._id,
          content: replyContent,
          parent_id,
        }),
      ).unwrap();
      setReplyingToId(null);
      setReplyContent("");
      toast.success("Reply added");
    } catch (error) {
      toast.error("Failed to add reply");
      console.error("Error adding reply:", error);
    }
  };

  const handleEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingContent(content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim() || !task._id) return;

    try {
      await dispatch(
        updateTaskNote({
          task_id: task._id,
          noteId,
          content: editingContent,
        }),
      ).unwrap();
      setEditingNoteId(null);
      setEditingContent("");
      toast.success("Note updated successfully");
    } catch (error) {
      toast.error("Failed to update note");
      console.error("Error updating note:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!task._id) return;

    try {
      await dispatch(
        deleteTaskNote({
          task_id: task._id,
          noteId,
        }),
      ).unwrap();
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error("Failed to delete note");
      console.error("Error deleting note:", error);
    }
  };

  const openDeleteDialog = (note: NoteRec) => {
    setDeleteTarget(note);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await handleDeleteNote(deleteTarget._idStr);
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // Get unique identifier for each note (id or fallback to index-based key)
  const getNoteKey = (note: Task["notes"][0], index: number) => {
    return note.id || note._id || `note-${index}`;
  };

  const notes = task.notes || [];
  const visibleNotes = notes.filter(
    (note) => !note.is_deleted && !note.isDeletedNote,
  );

  type NoteRec = Task["notes"][0] & {
    _key: string;
    _idStr: string;
    _parentId: string | null;
    _created_atMs: number;
  };

  const normalizedNotes: NoteRec[] = React.useMemo(() => {
    return visibleNotes
      .map((note, index) => {
        const key = getNoteKey(note, index);
        const idStr = String(note.id || note._id || "");
        const parent = (note.parent_id ?? null) ? String(note.parent_id) : null;
        const created_atMs = Number.isFinite(
          new Date(note.created_at).getTime(),
        )
          ? new Date(note.created_at).getTime()
          : 0;
        return {
          ...(note as any),
          _key: key,
          _idStr: idStr,
          _parentId: parent,
          _created_atMs: created_atMs,
        } as NoteRec;
      })
      .filter((n) => Boolean(n._idStr))
      .sort((a, b) => a._created_atMs - b._created_atMs);
  }, [visibleNotes]);

  const noteById = React.useMemo(() => {
    const map = new Map<string, NoteRec>();
    normalizedNotes.forEach((n) => map.set(n._idStr, n));
    return map;
  }, [normalizedNotes]);

  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, NoteRec[]>();
    normalizedNotes.forEach((n) => {
      const pid = n._parentId;
      if (!pid) return;
      const arr = map.get(pid) || [];
      arr.push(n);
      map.set(pid, arr);
    });
    return map;
  }, [normalizedNotes]);

  const topLevelNotes = React.useMemo(() => {
    return normalizedNotes.filter(
      (n) => !n._parentId || !noteById.has(n._parentId),
    );
  }, [normalizedNotes, noteById]);

  const renderThread = (note: NoteRec, depth: number) => {
    const noteId = note._idStr;
    const children = childrenByParent.get(noteId) || [];
    const canIndent = depth > 0;

    const authorRoleLabel = note.author.role
      ? String(note.author.role).toUpperCase()
      : undefined;

    const isEdited = Boolean(
      note.updated_at && note.updated_at !== note.created_at,
    );

    const author = note.author as NoteAuthor;
    const noteOwner = Boolean(
      currentUserId &&
      (String(author.id) === currentUserId ||
        String(author.user_id || "") === currentUserId ||
        (currentUserEmail &&
          String(author.email || "").toLowerCase() === currentUserEmail)),
    );

    return (
      <div
        key={note._key}
        className={
          canIndent
            ? "ml-6 pl-4 border-l border-slate-200 dark:border-slate-700"
            : ""
        }
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={note.author.avatar || "https://placehold.co/30/svg"}
                    alt={note.author.name}
                  />
                  <AvatarFallback className="text-xs">
                    {note.author.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {note.author.name}
                    </span>
                    {authorRoleLabel ? (
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]"
                      >
                        {authorRoleLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{formatDateTime(note.created_at)}</span>
                    {isEdited && note.updated_at ? (
                      <span>Edited {formatDateTime(note.updated_at)}</span>
                    ) : isEdited ? (
                      <span>Edited</span>
                    ) : null}
                  </div>
                </div>
              </div>
              {noteOwner ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEditNote(noteId, note.content)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-600 hover:text-red-700"
                    onClick={() => openDeleteDialog(note)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
            </div>

            {editingNoteId === noteId ? (
              <div className="space-y-3">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveEdit(noteId)}
                    size="sm"
                    disabled={!editingContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {note.content}
              </div>
            )}

            {editingNoteId !== noteId && (
              <div className="mt-3">
                {replyingToId === noteId ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(noteId)}
                        disabled={!replyContent.trim()}
                      >
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelReply}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300"
                    onClick={() => handleStartReply(noteId)}
                  >
                    <CornerDownRight className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {children.length > 0 && (
          <div className="mt-3 space-y-3">
            {children.map((child) => renderThread(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add Note */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Discussion
        </h3>
        <Textarea
          placeholder="Write a comment about this task..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          disabled={isAdding}
        />
        <Button onClick={handleAddNote} disabled={!newNote.trim() || isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? "Posting..." : "Post"}
        </Button>
      </div>
      {/* Notes List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Notes ({visibleNotes.length})
        </h3>

        {visibleNotes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No discussion yet
            </h4>
            <p className="text-slate-600 dark:text-slate-400">
              Start the thread by posting a comment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topLevelNotes.map((note) => renderThread(note, 0))}
          </div>
        )}
      </div>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>{" "}
    </div>
  );
}
