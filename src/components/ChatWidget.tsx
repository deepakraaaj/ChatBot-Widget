import React from "react";

import { useChat } from "../hooks/useChat";
import { ReactComponent as ChatIcon } from "../icons/chat.svg?react";
import { cn } from "../lib/cn";
import ChatWindow from "./ChatWindow";

const ChatWidget: React.FC = () => {
  const { isOpen, toggleChat, connectionStatus } = useChat();

  const statusDotClass =
    connectionStatus === "online"
      ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.14)]"
      : connectionStatus === "connecting"
        ? "bg-amber-400 animate-pulse shadow-[0_0_0_4px_rgba(251,191,36,0.14)]"
        : "bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,0.14)]";

  return (
    <div className="kriti-widget-root fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[2147483000] flex flex-col items-end gap-3 pointer-events-none">
      <div className="pointer-events-auto origin-bottom-right transition-all duration-300 ease-out">
        {isOpen && <ChatWindow />}
      </div>
      <button
        onClick={toggleChat}
        className={cn(
          "group relative overflow-hidden h-12 rounded-full border flex items-center justify-center transition-all duration-300 pointer-events-auto",
          isOpen
            ? "w-12 px-0 bg-white/95 text-slate-600 border-slate-200 hover:bg-white shadow-md"
            : "w-auto px-3.5 sm:px-4 bg-slate-900 text-white border-slate-700 hover:bg-slate-800 active:scale-[0.98] shadow-[0_10px_24px_rgba(15,23,42,0.28)]"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isOpen ? "justify-center" : "gap-2.5 pr-0.5"
          )}
        >
          <ChatIcon
            className={cn(
              "w-5 h-5 shrink-0 transition-transform duration-300",
              isOpen ? "rotate-90 scale-90" : "group-hover:translate-x-[1px]"
            )}
          />
          {!isOpen && (
            <>
              <span className="text-sm leading-none font-semibold tracking-[0.01em]">
                KritiBot
              </span>
              <span className={cn("inline-block h-2 w-2 rounded-full", statusDotClass)} />
            </>
          )}
        </div>
      </button>
    </div>
  );
};

export default ChatWidget;
