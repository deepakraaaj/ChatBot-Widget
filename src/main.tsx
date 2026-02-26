import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import ChatWidget from "./components/ChatWidget";
import { setChatRuntimeConfig } from "./hooks/useChat";
import { createWidgetStore } from "./store/widgetStore";
import "./widget.css";

setChatRuntimeConfig({
  backendUrl: import.meta.env.VITE_AI_BACKEND_URL,
});

const store = createWidgetStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ChatWidget />
    </Provider>
  </StrictMode>
);
