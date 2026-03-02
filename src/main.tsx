import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ChatWidget from "./components/ChatWidget";
import { ChatProvider, setChatRuntimeConfig } from "./hooks/useChat";
import "./widget.css";

setChatRuntimeConfig({
  backendUrl: import.meta.env.VITE_AI_BACKEND_URL,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChatProvider>
      <ChatWidget />
    </ChatProvider>
  </StrictMode>
);
