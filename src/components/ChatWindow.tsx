import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useChat } from "../hooks/useChat";
import { ChatMessage } from "../store/chatSlice";
import { ReactComponent as CloseIcon } from "../icons/close.svg?react";
import { ReactComponent as PaperPlaneIcon } from "../icons/paper-plane.svg?react";
import MessageBubble from "./MessageBubble";
import QuickActions from "./QuickActions";

const ChatWindow: React.FC = () => {
  const { messages, sendMessage, isStreaming, toggleChat } = useChat();
  const [input, setInput] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim()) return;

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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Online  
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
          messages.map((m: ChatMessage) => (
            <MessageBubble key={m.id} message={m} onOptionSelect={sendMessage} />
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

      <div className="p-3 bg-white/90 backdrop-blur-sm border-t border-slate-200 shrink-0">
        <div className="kriti-input-glow relative flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-300 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm text-slate-700 placeholder-slate-400 resize-none max-h-32 min-h-[22px] py-1 pl-0.5 scrollbar-hide leading-normal"
            rows={1}
            style={{ minHeight: "22px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            aria-label="Send message"
            className={twMerge(
              "p-2 rounded-xl transition-all mb-[1px]",
              input.trim() && !isStreaming
                ? "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_14px_rgba(31,83,213,0.28)]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
