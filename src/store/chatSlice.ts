import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type DataRow = Record<string, unknown>;
export type WorkflowOption =
  | string
  | {
      label?: string;
      name?: string;
      value?: string | number;
      id?: string | number;
    };

interface WorkflowPayload {
  title?: string;
  options?: WorkflowOption[];
}

interface WorkflowView {
  title?: string;
  payload?: WorkflowPayload;
  options?: WorkflowOption[];
  tasks?: WorkflowOption[];
}

interface SqlPayload {
  rows_preview?: DataRow[];
  row_count?: number;
  cached?: boolean;
  [key: string]: unknown;
}

export interface ChatResultPayload {
  message?: string;
  clarification_options?: WorkflowOption[];
  options_total_count?: number;
  options_shown_count?: number;
  workflow?: {
    ui?: WorkflowView;
    view?: WorkflowView;
  };
  sql?: SqlPayload;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean;
  metadata?: ChatResultPayload;
}

export interface ChatState {
  isOpen: boolean;
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  lastResult?: ChatResultPayload;
}

const initialState: ChatState = {
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  lastResult: undefined,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
    },
    setIsOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    appendToLastAssistantMessage: (state, action: PayloadAction<string>) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        lastMsg.content += action.payload;
      }
    },
    updateLastMessageMetadata: (
      state,
      action: PayloadAction<ChatResultPayload>
    ) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        const payload = action.payload || {};
        lastMsg.metadata = payload;
        if (!String(lastMsg.content || "").trim()) {
          const fallback = String(
            payload.message ||
              payload.workflow?.ui?.title ||
              payload.workflow?.view?.title ||
              ""
          ).trim();
          if (fallback) {
            lastMsg.content = fallback;
          }
        }
      }
      state.lastResult = action.payload;
    },
    setStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.sessionId = null;
      state.isStreaming = false;
      state.lastResult = undefined;
    },
  },
});

export const {
  toggleChat,
  setIsOpen,
  setSessionId,
  addMessage,
  appendToLastAssistantMessage,
  updateLastMessageMetadata,
  setStreaming,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
