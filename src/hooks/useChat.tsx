import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode } from "react";

import {
  chatReducer,
  createInitialChatState,
  type ChatAction,
  type ChatMessage,
  type ChatResultPayload,
} from "../chat/chatState";

interface ChatRuntimeContext {
  userId?: string;
  userName?: string;
  companyId?: string;
  companyName?: string;
}

interface ChatRuntimeConfig {
  backendUrl?: string;
  context?: ChatRuntimeContext;
  requestHeaders?: Record<string, string>;
}

interface ChatProviderProps {
  children: ReactNode;
  initialIsOpen?: boolean;
  runtimeConfig?: ChatRuntimeConfig;
}

interface ChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  connectionStatus: ChatConnectionStatus;
  sendMessage: (message: string) => Promise<void>;
  startSession: () => Promise<string | null>;
  toggleChat: () => void;
  setIsOpen: (open: boolean) => void;
  clearChat: () => void;
}

type AbortReason = "manual" | "timeout" | null;
type ChatConnectionStatus = "online" | "connecting" | "offline";

const STORAGE_USER_ID_KEY = "@STORAGE_USER_ID_KEY";
const STORAGE_USER_COMPANY_ID_KEY = "@STORAGE_USER_COMPANY_ID_KEY";
const STORAGE_USER_PROFILE_KEY = "@STORAGE_USER_PROFILE_KEY";

const GENERIC_SYSTEM_ERROR_MESSAGE =
  "\n[A temporary system issue occurred. Please try again.]";
const CONNECTION_ERROR_MESSAGE =
  "\n[Connection error. Please check your network or try again.]";
const TIMEOUT_ERROR_MESSAGE =
  "\n[Timeout: server took too long to respond. Please try again.]";
const START_SESSION_ERROR_MESSAGE =
  "\n[I'm having trouble connecting to the server. Please try again later.]";
const MISSING_BACKEND_URL_MESSAGE =
  "\n[KritiBot is not configured yet. Missing backend URL.]";

const ChatContext = createContext<ChatContextValue | null>(null);

let globalRuntimeConfig: ChatRuntimeConfig = {};

function normalizeBackendUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function getInitialConnectionStatus(backendUrl?: string): ChatConnectionStatus {
  if (!backendUrl) {
    return "offline";
  }

  return isBrowserOnline() ? "connecting" : "offline";
}

function clearTimer(timerRef: { current: number | null }) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function setChatRuntimeConfig(config?: ChatRuntimeConfig) {
  globalRuntimeConfig = {
    backendUrl: normalizeBackendUrl(config?.backendUrl),
    context: config?.context ? { ...config.context } : undefined,
    requestHeaders: config?.requestHeaders
      ? { ...config.requestHeaders }
      : undefined,
  };
}

function getNormalizedRuntimeConfig(
  config?: ChatRuntimeConfig
): ChatRuntimeConfig {
  return {
    backendUrl: normalizeBackendUrl(config?.backendUrl),
    context: config?.context ? { ...config.context } : undefined,
    requestHeaders: config?.requestHeaders
      ? { ...config.requestHeaders }
      : undefined,
  };
}

function getStorageValue(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(key);
    return value || undefined;
  } catch {
    return undefined;
  }
}

function getStoredUserName(): string | undefined {
  const raw = getStorageValue(STORAGE_USER_PROFILE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as {
      firstName?: string;
      lastName?: string;
    };
    if (!parsed.firstName) return undefined;
    return `${parsed.firstName} ${parsed.lastName || ""}`.trim();
  } catch {
    return undefined;
  }
}

function encodeBase64Utf8(value: string): string {
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  } catch {
    return btoa(value);
  }
}

const normalizeAssistantText = (text: string): string =>
  text
    .replace(
      /Choose an option number\/value, or type text to search the DB\. Use `more` for more options, `prev` for previous, or `back`\/`cancel` anytime\./gi,
      "Type an option number, type text to search, or use `more` / `prev`."
    )
    .replace(
      /Type option number, name\/value, `more`, or `prev`\./gi,
      "Type an option number, type text to search, or use `more` / `prev`."
    );

function isSessionExpiredMessage(message: unknown): boolean {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("not connected") ||
    normalized.includes("/session/start")
  );
}

function dispatchChatAction(
  dispatch: Dispatch<ChatAction>,
  action: ChatAction
) {
  dispatch(action);
}

function ChatProvider({
  children,
  initialIsOpen = false,
  runtimeConfig,
}: ChatProviderProps) {
  const [state, dispatch] = useReducer(
    chatReducer,
    createInitialChatState({
      isOpen: initialIsOpen,
    })
  );

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const sessionAbortControllerRef = useRef<AbortController | null>(null);
  const chatTimeoutRef = useRef<number | null>(null);
  const sessionTimeoutRef = useRef<number | null>(null);
  const sessionStartPromiseRef = useRef<Promise<string | null> | null>(null);
  const chatAbortReasonRef = useRef<AbortReason>(null);
  const sessionAbortReasonRef = useRef<AbortReason>(null);
  const sessionIdRef = useRef<string | null>(state.sessionId);

  const activeRuntimeConfig = getNormalizedRuntimeConfig(
    runtimeConfig || globalRuntimeConfig
  );
  const backendUrl = activeRuntimeConfig.backendUrl;
  const requestHeaders = activeRuntimeConfig.requestHeaders;
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>(() => getInitialConnectionStatus(backendUrl));

  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  useEffect(() => {
    if (!backendUrl || !isBrowserOnline()) {
      setConnectionStatus("offline");
      return;
    }

    setConnectionStatus((currentStatus) =>
      currentStatus === "online" ? "online" : "connecting"
    );
  }, [backendUrl]);

  useEffect(() => {
    if (state.sessionId) {
      setConnectionStatus("online");
    }
  }, [state.sessionId]);

  const clearSessionRequest = useCallback(() => {
    clearTimer(sessionTimeoutRef);
    sessionAbortControllerRef.current = null;
    sessionStartPromiseRef.current = null;
  }, []);

  const clearChatRequest = useCallback(() => {
    clearTimer(chatTimeoutRef);
    chatAbortControllerRef.current = null;
    readerRef.current = null;
  }, []);

  const cancelPendingSessionStart = useCallback(() => {
    sessionAbortReasonRef.current = "manual";
    clearTimer(sessionTimeoutRef);

    if (sessionAbortControllerRef.current) {
      sessionAbortControllerRef.current.abort();
      sessionAbortControllerRef.current = null;
    }

    sessionStartPromiseRef.current = null;
  }, []);

  const cancelActiveRequest = useCallback(() => {
    chatAbortReasonRef.current = "manual";
    clearTimer(chatTimeoutRef);

    if (readerRef.current) {
      void readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelActiveRequest();
      cancelPendingSessionStart();
    };
  }, [cancelActiveRequest, cancelPendingSessionStart]);

  const getContext = useCallback(() => {
    const context = {
      user_id:
        activeRuntimeConfig.context?.userId ||
        getStorageValue(STORAGE_USER_ID_KEY),
      user_name:
        activeRuntimeConfig.context?.userName || getStoredUserName() || "user",
      company_id:
        activeRuntimeConfig.context?.companyId ||
        getStorageValue(STORAGE_USER_COMPANY_ID_KEY),
      company_name: activeRuntimeConfig.context?.companyName || "the facility",
    };

    return encodeBase64Utf8(JSON.stringify(context));
  }, [activeRuntimeConfig.context]);

  const startSession = useCallback(async () => {
    if (sessionIdRef.current) {
      setConnectionStatus("online");
      return sessionIdRef.current;
    }

    if (!backendUrl) {
      console.error("KritiBot: backendUrl is not configured.");
      setConnectionStatus("offline");
      return null;
    }

    if (!isBrowserOnline()) {
      setConnectionStatus("offline");
      return null;
    }

    if (sessionStartPromiseRef.current) {
      return sessionStartPromiseRef.current;
    }

    setConnectionStatus("connecting");
    sessionAbortReasonRef.current = null;

    const pendingSession = (async () => {
      const controller = new AbortController();
      sessionAbortControllerRef.current = controller;
      sessionTimeoutRef.current = window.setTimeout(() => {
        sessionAbortReasonRef.current = "timeout";
        controller.abort();
      }, 15000);

      try {
        const contextB64 = getContext();
        const response = await fetch(`${backendUrl}/session/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(requestHeaders || {}),
            "x-user-context": contextB64,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to start session: ${response.status}`);
        }

        const data = await response.json();
        const nextSessionId =
          typeof data.session_id === "string"
            ? data.session_id
            : String(data.session_id || "");

        if (nextSessionId) {
          dispatchChatAction(dispatch, {
            type: "setSessionId",
            payload: nextSessionId,
          });
          sessionIdRef.current = nextSessionId;
          setConnectionStatus("online");
          return nextSessionId;
        }
      } catch (error) {
        const isManualAbort =
          error instanceof DOMException &&
          error.name === "AbortError" &&
          sessionAbortReasonRef.current === "manual";

        if (!isManualAbort) {
          console.error("Failed to start session", error);
          setConnectionStatus("offline");
        }

        return null;
      } finally {
        clearSessionRequest();
      }

      setConnectionStatus("offline");
      return null;
    })();

    sessionStartPromiseRef.current = pendingSession;
    return pendingSession;
  }, [backendUrl, clearSessionRequest, getContext, requestHeaders]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      setConnectionStatus("offline");
    };

    const handleOnline = () => {
      if (!backendUrl) {
        setConnectionStatus("offline");
        return;
      }

      setConnectionStatus((currentStatus) =>
        currentStatus === "online" ? "online" : "connecting"
      );

      if (state.isOpen && !sessionIdRef.current) {
        void startSession();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [backendUrl, startSession, state.isOpen]);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage || state.isStreaming) return;

      const timestamp = Date.now();
      dispatchChatAction(dispatch, {
        type: "addMessage",
        payload: {
          id: `${timestamp}-user`,
          role: "user",
          content: trimmedMessage,
          timestamp,
        },
      });
      dispatchChatAction(dispatch, {
        type: "addMessage",
        payload: {
          id: `${timestamp}-assistant`,
          role: "assistant",
          content: "",
          timestamp: timestamp + 1,
        },
      });
      dispatchChatAction(dispatch, {
        type: "setStreaming",
        payload: true,
      });

      try {
        let currentSessionId = sessionIdRef.current;
        const maxRetries = 1;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          if (!backendUrl) {
            setConnectionStatus("offline");
            dispatchChatAction(dispatch, {
              type: "appendToLastAssistantMessage",
              payload: MISSING_BACKEND_URL_MESSAGE,
            });
            return;
          }

          if (!isBrowserOnline()) {
            setConnectionStatus("offline");
            dispatchChatAction(dispatch, {
              type: "appendToLastAssistantMessage",
              payload: CONNECTION_ERROR_MESSAGE,
            });
            return;
          }

          if (!currentSessionId) {
            currentSessionId = await startSession();
            if (!currentSessionId) {
              if (sessionAbortReasonRef.current === "manual") {
                return;
              }

              dispatchChatAction(dispatch, {
                type: "appendToLastAssistantMessage",
                payload:
                  sessionAbortReasonRef.current === "timeout"
                    ? TIMEOUT_ERROR_MESSAGE
                    : START_SESSION_ERROR_MESSAGE,
              });
              return;
            }
          }

          try {
            chatAbortReasonRef.current = null;

            const contextB64 = getContext();
            const controller = new AbortController();
            chatAbortControllerRef.current = controller;
            chatTimeoutRef.current = window.setTimeout(() => {
              chatAbortReasonRef.current = "timeout";
              controller.abort();
            }, 45000);

            const response = await fetch(`${backendUrl}/chat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(requestHeaders || {}),
                "x-user-context": contextB64,
              },
              signal: controller.signal,
              body: JSON.stringify({
                session_id: currentSessionId,
                message: trimmedMessage,
              }),
            });

            if (!response.ok) {
              throw new Error(
                `Server error: ${response.status} ${response.statusText}`
              );
            }

            setConnectionStatus("online");

            if (!response.body) {
              throw new Error("No response body");
            }

            const reader = response.body.getReader();
            readerRef.current = reader;
            const decoder = new TextDecoder();
            let buffer = "";
            let sessionExpired = false;
            let surfacedSystemError = false;

            const handlePayload = (payload: Record<string, unknown>) => {
              const payloadType = String(payload.type || "");

              if (payloadType === "token") {
                dispatchChatAction(dispatch, {
                  type: "appendToLastAssistantMessage",
                  payload: normalizeAssistantText(String(payload.content || "")),
                });
                return;
              }

              if (payloadType === "result") {
                const resultPayload = {
                  ...payload,
                } as ChatResultPayload;

                if (typeof resultPayload.message === "string") {
                  resultPayload.message = normalizeAssistantText(
                    resultPayload.message
                  );
                }

                dispatchChatAction(dispatch, {
                  type: "updateLastMessageMetadata",
                  payload: resultPayload,
                });
                return;
              }

              if (payloadType !== "error") {
                return;
              }

              const rawMessage = String(payload.message || "");
              if (isSessionExpiredMessage(rawMessage)) {
                sessionExpired = true;
                return;
              }

              if (!surfacedSystemError) {
                surfacedSystemError = true;
                console.error("Chat stream error", rawMessage);
                dispatchChatAction(dispatch, {
                  type: "appendToLastAssistantMessage",
                  payload: GENERIC_SYSTEM_ERROR_MESSAGE,
                });
              }
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.trim()) continue;

                try {
                  handlePayload(JSON.parse(line) as Record<string, unknown>);
                } catch (error) {
                  console.error("Error parsing JSON chunk", error);
                }
              }
            }

            if (buffer.trim()) {
              try {
                handlePayload(JSON.parse(buffer) as Record<string, unknown>);
              } catch (error) {
                console.error("Error parsing trailing JSON chunk", error);
              }
            }

            clearChatRequest();

            if (sessionExpired && attempt < maxRetries) {
              setConnectionStatus("connecting");
              currentSessionId = null;
              sessionIdRef.current = null;
              dispatchChatAction(dispatch, {
                type: "setSessionId",
                payload: null,
              });
              continue;
            }

            return;
          } catch (error) {
            const isAbortError =
              error instanceof DOMException && error.name === "AbortError";

            if (!isAbortError) {
              console.error("Chat error", error);
            }

            clearChatRequest();

            if (isAbortError && chatAbortReasonRef.current === "manual") {
              return;
            }

            setConnectionStatus("offline");

            dispatchChatAction(dispatch, {
              type: "appendToLastAssistantMessage",
              payload:
                chatAbortReasonRef.current === "timeout"
                  ? TIMEOUT_ERROR_MESSAGE
                  : CONNECTION_ERROR_MESSAGE,
            });
            return;
          }
        }
      } finally {
        clearChatRequest();
        dispatchChatAction(dispatch, {
          type: "setStreaming",
          payload: false,
        });
      }
    },
    [backendUrl, clearChatRequest, getContext, requestHeaders, startSession, state.isStreaming]
  );

  const toggleChat = useCallback(() => {
    if (!state.isOpen && !sessionIdRef.current) {
      void startSession();
    }

    dispatchChatAction(dispatch, {
      type: "toggleChat",
    });
  }, [startSession, state.isOpen]);

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (open && !sessionIdRef.current) {
        void startSession();
      }

      dispatchChatAction(dispatch, {
        type: "setIsOpen",
        payload: open,
      });
    },
    [startSession]
  );

  const clearChat = useCallback(() => {
    cancelActiveRequest();
    cancelPendingSessionStart();
    sessionIdRef.current = null;
    dispatchChatAction(dispatch, {
      type: "clearChat",
    });
  }, [cancelActiveRequest, cancelPendingSessionStart]);

  const value: ChatContextValue = {
    isOpen: state.isOpen,
    messages: state.messages,
    isStreaming: state.isStreaming,
    connectionStatus,
    sendMessage,
    startSession,
    toggleChat,
    setIsOpen,
    clearChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function useChat(): ChatContextValue {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within ChatProvider.");
  }

  return context;
}

export type {
  ChatConnectionStatus,
  ChatMessage,
  ChatResultPayload,
  ChatRuntimeConfig,
  ChatRuntimeContext,
};
export { ChatProvider, setChatRuntimeConfig, useChat };
