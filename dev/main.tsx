import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ChatWidget from "../src/components/ChatWidget";
import { ChatProvider, setChatRuntimeConfig } from "../src/hooks/useChat";
import "../src/widget.css";

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
