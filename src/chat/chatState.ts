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

export type ChatAction =
  | { type: "toggleChat" }
  | { type: "setIsOpen"; payload: boolean }
  | { type: "setSessionId"; payload: string | null }
  | { type: "addMessage"; payload: ChatMessage }
  | { type: "appendToLastAssistantMessage"; payload: string }
  | { type: "updateLastMessageMetadata"; payload: ChatResultPayload }
  | { type: "setStreaming"; payload: boolean }
  | { type: "clearChat" };

function getInitialChatState(): ChatState {
  return {
    isOpen: false,
    sessionId: null,
    messages: [],
    isStreaming: false,
    lastResult: undefined,
  };
}

function createInitialChatState(
  overrides?: Partial<Pick<ChatState, "isOpen">>
): ChatState {
  return {
    ...getInitialChatState(),
    ...overrides,
  };
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "toggleChat":
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case "setIsOpen":
      return {
        ...state,
        isOpen: action.payload,
      };

    case "setSessionId":
      return {
        ...state,
        sessionId: action.payload,
      };

    case "addMessage":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case "appendToLastAssistantMessage": {
      const nextMessages = [...state.messages];
      const lastMessage = nextMessages[nextMessages.length - 1];

      if (!lastMessage || lastMessage.role !== "assistant") {
        return state;
      }

      nextMessages[nextMessages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + action.payload,
      };

      return {
        ...state,
        messages: nextMessages,
      };
    }

    case "updateLastMessageMetadata": {
      const nextMessages = [...state.messages];
      const lastMessage = nextMessages[nextMessages.length - 1];
      const payload = action.payload || {};

      if (lastMessage && lastMessage.role === "assistant") {
        const fallback = String(
          payload.message ||
            payload.workflow?.ui?.title ||
            payload.workflow?.view?.title ||
            ""
        ).trim();

        nextMessages[nextMessages.length - 1] = {
          ...lastMessage,
          metadata: payload,
          content:
            !String(lastMessage.content || "").trim() && fallback
              ? fallback
              : lastMessage.content,
        };
      }

      return {
        ...state,
        messages: nextMessages,
        lastResult: payload,
      };
    }

    case "setStreaming":
      return {
        ...state,
        isStreaming: action.payload,
      };

    case "clearChat":
      return {
        ...getInitialChatState(),
        isOpen: state.isOpen,
      };

    default:
      return state;
  }
}

export { chatReducer, createInitialChatState };
