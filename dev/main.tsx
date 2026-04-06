import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import DemoShell from "../src/components/DemoShell";
import "../src/widget.css";

const backendUrl =
  (String(import.meta.env.VITE_AI_BACKEND_URL || "").trim() ||
    "/api").replace(/\/+$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoShell backendUrl={backendUrl} />
  </StrictMode>
);
