import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  addMessage,
  appendToLastAssistantMessage,
  clearChat,
  setIsOpen,
  setSessionId,
  setStreaming,
  toggleChat,
  updateLastMessageMetadata,
} from "../store/chatSlice";
import { WidgetRootState } from "../store/widgetStore";

const DEFAULT_AI_BACKEND_URL =
  import.meta.env.VITE_AI_BACKEND_URL || "http://localhost:8006";

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

const STORAGE_USER_ID_KEY = "@STORAGE_USER_ID_KEY";
const STORAGE_USER_COMPANY_ID_KEY = "@STORAGE_USER_COMPANY_ID_KEY";
const STORAGE_USER_PROFILE_KEY = "@STORAGE_USER_PROFILE_KEY";

let runtimeConfig: ChatRuntimeConfig = {};

function setChatRuntimeConfig(config?: ChatRuntimeConfig) {
  runtimeConfig = {
    backendUrl: config?.backendUrl,
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

const GENERIC_SYSTEM_ERROR_MESSAGE =
  "\n[A temporary system issue occurred. Please try again.]";

function isSessionExpiredMessage(message: unknown): boolean {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("not connected") ||
    normalized.includes("/session/start")
  );
}

function useChat() {
  const dispatch = useDispatch();
  const { sessionId, messages, isStreaming, isOpen } = useSelector(
    (state: WidgetRootState) => state.chat
  );

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );
  const backendUrl = (
    runtimeConfig.backendUrl || DEFAULT_AI_BACKEND_URL
  ).replace(/\/+$/, "");
  const requestHeaders = runtimeConfig.requestHeaders || {};

  const getContext = useCallback(() => {
    const context = {
      user_id: runtimeConfig.context?.userId || getStorageValue(STORAGE_USER_ID_KEY),
      user_name: runtimeConfig.context?.userName || getStoredUserName() || "user",
      company_id:
        runtimeConfig.context?.companyId ||
        getStorageValue(STORAGE_USER_COMPANY_ID_KEY),
      company_name: runtimeConfig.context?.companyName || "the facility",
    };
    return encodeBase64Utf8(JSON.stringify(context));
  }, []);

  const startSession = useCallback(async () => {
    try {
      const contextB64 = getContext();
      const response = await fetch(`${backendUrl}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...requestHeaders,
          "x-user-context": contextB64,
        },
      });
      if (!response.ok) throw new Error("Failed to start session");
      const data = await response.json();
      const nextSessionId =
        typeof data.session_id === "string"
          ? data.session_id
          : String(data.session_id || "");
      if (nextSessionId) {
        dispatch(setSessionId(nextSessionId));
        return nextSessionId;
      }
    } catch (error) {
      console.error("Failed to start session", error);
      return null;
    }
    return null;
  }, [backendUrl, dispatch, getContext, requestHeaders]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isStreaming) return;

      let currentSessionId = sessionId;
      let retryCount = 0;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        if (!currentSessionId) {
          currentSessionId = await startSession();
          if (!currentSessionId) {
            dispatch(
              addMessage({
                id: Date.now().toString(),
                role: "assistant",
                content:
                  "I'm having trouble connecting to the server. Please try again later.",
                timestamp: Date.now(),
                isError: true,
              })
            );
            return;
          }
        }

        if (retryCount === 0) {
          dispatch(
            addMessage({
              id: Date.now().toString(),
              role: "user",
              content: message,
              timestamp: Date.now(),
            })
          );
          dispatch(setStreaming(true));
          dispatch(
            addMessage({
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: "",
              timestamp: Date.now(),
            })
          );
        }

        try {
          const contextB64 = getContext();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          const response = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...requestHeaders,
              "x-user-context": contextB64,
            },
            signal: controller.signal,
            body: JSON.stringify({
              session_id: currentSessionId,
              message,
            }),
          });
          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
          }

          if (!response.body) throw new Error("No response body");

          const reader = response.body.getReader();
          readerRef.current = reader;
          const decoder = new TextDecoder();
          let buffer = "";
          let sessionExpired = false;
          let surfacedSystemError = false;

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
                const data = JSON.parse(line);
                if (data.type === "token") {
                  dispatch(
                    appendToLastAssistantMessage(
                      normalizeAssistantText(String(data.content || ""))
                    )
                  );
                } else if (data.type === "result") {
                  if (typeof data.message === "string") {
                    data.message = normalizeAssistantText(data.message);
                  }
                  dispatch(updateLastMessageMetadata(data));
                } else if (data.type === "error") {
                  const rawMessage = String(data.message || "");
                  if (isSessionExpiredMessage(rawMessage)) {
                    sessionExpired = true;
                  } else if (!surfacedSystemError) {
                    surfacedSystemError = true;
                    console.error("Chat stream error", rawMessage);
                    dispatch(
                      appendToLastAssistantMessage(GENERIC_SYSTEM_ERROR_MESSAGE)
                    );
                  }
                }
              } catch (e) {
                console.error("Error parsing JSON chunk", e);
              }
            }
          }

          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              if (data.type === "token") {
                dispatch(
                  appendToLastAssistantMessage(
                    normalizeAssistantText(String(data.content || ""))
                  )
                );
              } else if (data.type === "result") {
                if (typeof data.message === "string") {
                  data.message = normalizeAssistantText(data.message);
                }
                dispatch(updateLastMessageMetadata(data));
              } else if (data.type === "error") {
                const rawMessage = String(data.message || "");
                if (isSessionExpiredMessage(rawMessage)) {
                  sessionExpired = true;
                } else if (!surfacedSystemError) {
                  surfacedSystemError = true;
                  console.error("Chat trailing stream error", rawMessage);
                  dispatch(
                    appendToLastAssistantMessage(GENERIC_SYSTEM_ERROR_MESSAGE)
                  );
                }
              }
            } catch (e) {
              console.error("Error parsing trailing JSON chunk", e);
            }
          }

          if (sessionExpired && retryCount === 0) {
            currentSessionId = null;
            dispatch(setSessionId(null));
            retryCount++;
            continue;
          }

          break;
        } catch (error) {
          console.error("Chat error", error);
          const isTimeout =
            error instanceof DOMException && error.name === "AbortError";
          const msg = isTimeout
            ? "\n[Timeout: server took too long to respond. Please try again.]"
            : "\n[Connection Error. Please check your network or try again.]";
          dispatch(appendToLastAssistantMessage(msg));
          break;
        } finally {
          dispatch(setStreaming(false));
          readerRef.current = null;
        }
      }
    },
    [
      backendUrl,
      dispatch,
      getContext,
      isStreaming,
      requestHeaders,
      sessionId,
      startSession,
    ]
  );

  const handleToggleChat = useCallback(() => {
    if (!isOpen && !sessionId) {
      startSession();
    }
    dispatch(toggleChat());
  }, [dispatch, isOpen, sessionId, startSession]);

  const handleClearChat = useCallback(() => {
    dispatch(clearChat());
    startSession();
  }, [dispatch, startSession]);

  return {
    isOpen,
    messages,
    isStreaming,
    sendMessage,
    startSession,
    toggleChat: handleToggleChat,
    setIsOpen: (open: boolean) => {
      if (open && !sessionId) startSession();
      dispatch(setIsOpen(open));
    },
    clearChat: handleClearChat,
  };
}

export type { ChatRuntimeConfig, ChatRuntimeContext };
export { setChatRuntimeConfig, useChat };
