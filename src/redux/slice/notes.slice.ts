import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Note type
export type Note = {
  id: string;
  sectionId: string;
  body: string;
  created_at: number;
  updated_at: number;
};

export interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
}

const initialState: NotesState = {
  notes: [],
  loading: false,
  error: null,
};

const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    addNote: (
      state,
      action: PayloadAction<{ sectionId: string; body: string }>,
    ) => {
      const { sectionId, body } = action.payload;
      const newNote: Note = {
        id: `note-${Date.now()}`,
        sectionId,
        body,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      state.notes.push(newNote);
    },
    updateNote: (
      state,
      action: PayloadAction<{ noteId: string; body: string }>,
    ) => {
      const { noteId, body } = action.payload;
      const note = state.notes.find((n) => n.id === noteId);
      if (note) {
        note.body = body;
        note.updated_at = Date.now();
      }
    },
    deleteNote: (state, action: PayloadAction<string>) => {
      state.notes = state.notes.filter((note) => note.id !== action.payload);
    },
    setNotes: (state, action: PayloadAction<Note[]>) => {
      state.notes = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  addNote,
  updateNote,
  deleteNote,
  setNotes,
  setLoading,
  setError,
} = notesSlice.actions;

export default notesSlice.reducer;
