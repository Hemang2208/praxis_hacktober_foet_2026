import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChapterUIState {
  openSections: string[];
}

const initialState: ChapterUIState = {
  openSections: [],
};

const chapterUISlice = createSlice({
  name: "chapterUI",
  initialState,
  reducers: {
    setOpenSections: (state, action: PayloadAction<string[]>) => {
      state.openSections = action.payload;
    },
    toggleSection: (state, action: PayloadAction<string>) => {
      const sectionId = action.payload;
      if (state.openSections.includes(sectionId)) {
        state.openSections = state.openSections.filter(
          (id) => id !== sectionId,
        );
      } else {
        state.openSections.push(sectionId);
      }
    },
    openSection: (state, action: PayloadAction<string>) => {
      if (!state.openSections.includes(action.payload)) {
        state.openSections.push(action.payload);
      }
    },
    closeSection: (state, action: PayloadAction<string>) => {
      state.openSections = state.openSections.filter(
        (id) => id !== action.payload,
      );
    },
    clearOpenSections: (state) => {
      state.openSections = [];
    },
  },
});

export const {
  setOpenSections,
  toggleSection,
  openSection,
  closeSection,
  clearOpenSections,
} = chapterUISlice.actions;

export default chapterUISlice.reducer;
