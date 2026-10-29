import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  type?: string;
  data?: unknown;
};

export type SupportChatSession = {
  id: string;
  title?: string;
  messages: Message[];
  lastActivity?: string;
};

interface SupportChatState {
  sessions: SupportChatSession[];
  loading: boolean;
  error?: string | null;
}

const initialState: SupportChatState = {
  sessions: [],
  loading: false,
  error: null,
};

export const fetchSupportChats = createAsyncThunk<
  SupportChatSession[],
  void,
  { rejectValue: string }
>("supportChat/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await fetch("/api/support-chats", {
      credentials: "same-origin",
    });

    const contentType = res.headers.get("content-type");

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: Failed to fetch`;

      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response", e);
        }
      } else {
        // Log non-JSON error responses for debugging
        const text = await res.text().catch(() => "(unable to read response body)");
        console.error("fetchSupportChats: non-JSON error response", {
          status: res.status,
          contentType,
          bodyPreview: text.slice(0, 200),
        });
      }

      console.error("fetchSupportChats: API error", {
        status: res.status,
        errorMsg,
      });
      throw new Error(errorMsg);
    }

    // Check content-type before parsing JSON to avoid parsing HTML as JSON
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text().catch(() => "(unable to read response body)");
      console.error("fetchSupportChats: unexpected content-type on success response", {
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 200),
      });
      throw new Error(
        `Expected JSON response but got ${contentType || "unknown content-type"}`
      );
    }

    const data = await res.json();
    return data.chats as SupportChatSession[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fetchSupportChats: error", msg);
    return rejectWithValue(msg || "Error fetching support chats");
  }
});

type SaveRequest = {
  question: string;
  response: string;
  title?: string;
  type?: string;
  data?: unknown;
  chatId?: string;
};
type SaveResponse = {
  id: string;
  title?: string;
  question?: string;
  response?: string;
  type?: string;
  data?: unknown;
};

export const saveSupportChat = createAsyncThunk<
  SaveResponse,
  SaveRequest,
  { rejectValue: string }
>("supportChat/save", async (payload, { rejectWithValue }) => {
  try {
    // Validate that we have both question and response with meaningful content
    if (!payload.question || !payload.question.trim()) {
      return rejectWithValue("Question is required and cannot be empty");
    }
    if (!payload.response || !payload.response.trim()) {
      return rejectWithValue("Response is required and cannot be empty");
    }

    console.debug("saveSupportChat: sending payload", payload);

    const res = await fetch("/api/support-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    // Check if response is ok before parsing
    const contentType = res.headers.get("content-type");

    if (!res.ok) {
      // Try to get error message from response
      let errorMsg = `HTTP ${res.status}: Failed to save chat`;

      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response as JSON", e);
        }
      } else if (contentType && contentType.includes("text/")) {
        try {
          const errorText = await res.text();
          errorMsg = `HTTP ${res.status}: ${errorText.slice(0, 200)}`;
        } catch (e) {
          console.error("Failed to parse error response as text", e);
        }
      }

      console.error("saveSupportChat: API error", {
        status: res.status,
        statusText: res.statusText,
        errorMsg,
      });
      throw new Error(errorMsg);
    }

    // Check content-type before parsing JSON
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text().catch(() => "(unable to read response body)");
      console.error("saveSupportChat: unexpected content-type on success response", {
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 200),
      });
      throw new Error(
        `Expected JSON response but got ${contentType || "unknown content-type"}`
      );
    }

    const data = await res.json();
    return {
      id: data.chatId,
      title: payload.title,
      question: payload.question,
      response: payload.response,
      type: payload.type,
      data: payload.data,
    } as SaveResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("saveSupportChat: error", msg);
    return rejectWithValue(msg || "Error saving chat");
  }
});

export const deleteSupportChat = createAsyncThunk<
  string,
  { chatId: string },
  { rejectValue: string }
>("supportChat/delete", async ({ chatId }, { rejectWithValue }) => {
  try {
    const res = await fetch("/api/support-chats", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ chatId }),
    });

    const contentType = res.headers.get("content-type");

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: Failed to delete chat`;

      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response", e);
        }
      } else {
        try {
          const txt = await res.text();
          errorMsg = `HTTP ${res.status}: ${txt.slice(0, 200)}`;
        } catch (e) {
          console.error("Failed to read error response text", e);
        }
      }

      console.error("deleteSupportChat: API error", {
        status: res.status,
        errorMsg,
      });
      throw new Error(errorMsg);
    }

    // Check content-type before parsing JSON
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text().catch(() => "(unable to read response body)");
      console.error("deleteSupportChat: unexpected content-type on success response", {
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 200),
      });
      throw new Error(
        `Expected JSON response but got ${contentType || "unknown content-type"}`
      );
    }

    const data = await res.json();
    return data.chatId as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("deleteSupportChat: error", msg);
    return rejectWithValue(msg || "Error deleting chat");
  }
});

export const updateSupportChatTitle = createAsyncThunk<
  { chatId: string; title: string },
  { chatId: string; title: string },
  { rejectValue: string }
>("supportChat/updateTitle", async ({ chatId, title }, { rejectWithValue }) => {
  try {
    const res = await fetch("/api/support-chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ chatId, title }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to update chat title");
    }
    const data = await res.json();
    return { chatId: data.chatId as string, title: data.title as string };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return rejectWithValue(msg || "Error updating chat title");
  }
});

const slice = createSlice({
  name: "supportChat",
  initialState,
  reducers: {
    addLocalSession(state, action: PayloadAction<SupportChatSession>) {
      state.sessions.unshift(action.payload);
    },
    clearSessions(state) {
      state.sessions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupportChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSupportChats.fulfilled,
        (state, action: PayloadAction<SupportChatSession[]>) => {
          state.loading = false;
          state.sessions = action.payload;
        },
      )
      .addCase(fetchSupportChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(saveSupportChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        saveSupportChat.fulfilled,
        (state, action: PayloadAction<SaveResponse>) => {
          state.loading = false;
          // Prepend saved session
          const existingIndex = state.sessions.findIndex(
            (s) => String(s.id) === String(action.payload.id),
          );
          const userMsg: Message = {
            role: "user",
            content: action.payload.question ?? "",
            timestamp: new Date().toISOString(),
          };
          const assistantMsg: Message = {
            role: "assistant",
            content: action.payload.response ?? "",
            timestamp: new Date().toISOString(),
            ...(action.payload.type ? { type: action.payload.type } : {}),
            ...(typeof action.payload.data !== "undefined"
              ? { data: action.payload.data }
              : {}),
          };

          if (existingIndex !== -1) {
            const session = state.sessions[existingIndex];
            session.messages = [...session.messages, userMsg, assistantMsg];
            session.lastActivity = new Date().toISOString();
            state.sessions.splice(existingIndex, 1);
            state.sessions.unshift(session);
          } else {
            const newSession: SupportChatSession = {
              id: action.payload.id,
              title: action.payload.title,
              messages: [userMsg, assistantMsg],
              lastActivity: new Date().toISOString(),
            };
            state.sessions.unshift(newSession);
          }
        },
      )
      .addCase(saveSupportChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    builder
      .addCase(updateSupportChatTitle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateSupportChatTitle.fulfilled,
        (state, action: PayloadAction<{ chatId: string; title: string }>) => {
          state.loading = false;
          const { chatId, title } = action.payload;
          const idx = state.sessions.findIndex(
            (s) => String(s.id) === String(chatId),
          );
          if (idx !== -1) {
            state.sessions[idx].title = title;
          }
        },
      )
      .addCase(updateSupportChatTitle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    builder
      .addCase(deleteSupportChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteSupportChat.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          const id = action.payload;
          state.sessions = state.sessions.filter(
            (s) => String(s.id) !== String(id),
          );
        },
      )
      .addCase(deleteSupportChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addLocalSession, clearSessions } = slice.actions;
export default slice.reducer;
