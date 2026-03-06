import React, { useEffect, useRef, useState } from "react";

import { useChat } from "../hooks/useChat";
import { useVoiceInput } from "@voice-input";
import type { ChatMessage } from "../chat/chatState";
import { ReactComponent as CloseIcon } from "../icons/close.svg?react";
import { ReactComponent as PaperPlaneIcon } from "../icons/paper-plane.svg?react";
import { ReactComponent as MicIcon } from "../icons/microphone.svg?react";
import { cn } from "../lib/cn";
import MessageBubble from "./MessageBubble";
import QuickActions from "./QuickActions";

declare const __KRITIBOT_ENABLE_VOICE__: boolean;

const VOICE_ERROR_LABEL: Record<string, string> = {
  "not-allowed": "Microphone access denied",
  "no-speech": "No speech detected",
  network: "Network error",
  unknown: "Voice error",
};

const ChatWindow: React.FC = () => {
  const { messages, sendMessage, isStreaming, toggleChat, connectionStatus } =
    useChat();
  const [input, setInput] = useState("");

  const {
    isSupported: isMicSupported,
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput();

  const voiceEnabled = __KRITIBOT_ENABLE_VOICE__;
  const canUseVoice = voiceEnabled && isMicSupported;
  const micDisabled = isStreaming || !canUseVoice;

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousIsListeningRef = useRef(isListening);

  /* ------- scroll to bottom when messages change ------- */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
        block: "end",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [messages, isStreaming]);

  /* ------- sync voice transcript into the textarea ------- */
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
      // Auto-resize textarea to fit transcript
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [transcript]);

  /* ------- auto-send completed voice captures ------- */
  useEffect(() => {
    const wasListening = previousIsListeningRef.current;
    previousIsListeningRef.current = isListening;

    const spokenText = transcript.trim();
    if (
      !voiceEnabled ||
      isStreaming ||
      voiceError ||
      !wasListening ||
      isListening ||
      !spokenText
    ) {
      return;
    }

    clearTranscript();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    sendMessage(spokenText);
  }, [
    clearTranscript,
    isListening,
    isStreaming,
    sendMessage,
    transcript,
    voiceEnabled,
    voiceError,
  ]);

  const handleSend = (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim()) return;

    if (voiceEnabled) {
      if (isListening) stopListening();
      clearTranscript();
    }
    sendMessage(messageToSend);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleMicToggle = () => {
    if (!canUseVoice || isStreaming) return;

    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      setInput("");
      startListening();
    }
  };

  const statusLabel =
    connectionStatus === "online"
      ? "Online"
      : connectionStatus === "connecting"
        ? "Connecting..."
        : "Offline";

  const statusDotClass =
    connectionStatus === "online"
      ? "bg-emerald-300"
      : connectionStatus === "connecting"
        ? "bg-amber-300 animate-pulse"
        : "bg-rose-300";

  return (
    <div className="kriti-window-shadow kriti-chat-surface w-[420px] max-w-[calc(100vw-1rem)] h-[680px] max-h-[calc(100vh-5.5rem)] rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden border border-slate-200/70 ring-1 ring-slate-900/5 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="kriti-header-gradient p-4 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl border border-white/25 bg-white/15 text-white text-[13px] font-bold flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
            KB
          </div>
          <div className="flex flex-col justify-center gap-0.5">
            <p className="font-semibold text-[15px] leading-5 text-white tracking-[0.01em]">
              KritiBot
            </p>
            <p className="inline-flex items-center gap-1.5 text-[11px] leading-none text-blue-100/95">
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass)} />
              {statusLabel}
            </p>
          </div>
        </div>
        <button
          onClick={toggleChat}
          className="text-white/75 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-all"
          aria-label="Close chat"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 scroll-smooth no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-end pb-3">
            <div className="mb-5 px-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-1">How can I help?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ask about tasks, status updates, or recent activity.
              </p>
            </div>
            <QuickActions onAction={handleSend} />
          </div>
        ) : (
          messages.map((m: ChatMessage, index) => (
            <MessageBubble
              key={m.id}
              message={m}
              onOptionSelect={sendMessage}
              isDisabled={m.role === "assistant" && index < messages.length - 1}
            />
          ))
        )}

        {isStreaming && (
          <div className="flex gap-1.5 items-center ml-12 mb-4 h-6">
            <span className="w-1.5 h-1.5 bg-brand-500/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-brand-500/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-brand-500/70 rounded-full animate-bounce" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ------- Voice status bar ------- */}
      {voiceEnabled && isListening && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-red-600 bg-red-50/80 border-t border-red-100 animate-in fade-in duration-200">
          <span className="kriti-mic-pulse-dot" />
          <span className="font-medium">Listening…</span>
          <span className="text-red-400 ml-auto">Tap mic to stop</span>
        </div>
      )}

      {/* ------- Voice error bar ------- */}
      {voiceEnabled && voiceError && !isListening && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/80 border-t border-amber-100 animate-in fade-in duration-200">
          <span>⚠</span>
          <span className="font-medium">{VOICE_ERROR_LABEL[voiceError] ?? "Voice error"}</span>
        </div>
      )}

      <div className="p-3 bg-white/90 backdrop-blur-sm border-t border-slate-200 shrink-0">
        <div className="kriti-input-glow relative flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-300 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={voiceEnabled && isListening ? "Speak now..." : "Ask a question..."}
            className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm text-slate-700 placeholder-slate-400 resize-none max-h-32 min-h-[22px] py-1 pl-0.5 scrollbar-hide leading-normal"
            rows={1}
            style={{ minHeight: "22px" }}
          />

          {/* ------- Mic button ------- */}
          {voiceEnabled && (
            <button
              onClick={handleMicToggle}
              disabled={micDisabled}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              title={
                !isMicSupported
                  ? "Voice input not supported in this browser. Try Chrome/Edge on HTTPS."
                  : isListening
                    ? "Stop voice input"
                    : "Start voice input"
              }
              className={cn(
                "relative p-2 rounded-xl transition-all mb-px shrink-0 border",
                isListening
                  ? "kriti-mic-active text-white border-red-500/70"
                  : micDisabled
                    ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700",
                isStreaming && "opacity-60"
              )}
            >
              {isListening && <span className="kriti-mic-pulse-ring" />}
              <MicIcon className="w-4 h-4 relative z-10" />
            </button>
          )}

          {/* ------- Send button ------- */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            aria-label="Send message"
            className={cn(
              "p-2 rounded-xl transition-all mb-px",
              input.trim() && !isStreaming
                ? "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_14px_rgba(31,83,213,0.28)]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </button>
        </div>
        {voiceEnabled && !isMicSupported && (
          <p className="mt-1.5 px-1 text-[11px] leading-4 text-amber-700/90">
            Voice input is unavailable here. Use Chrome or Edge over HTTPS.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
