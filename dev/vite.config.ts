import { resolve } from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const enableVoice = process.env.KRITIBOT_ENABLE_VOICE !== "false";

export default defineConfig({
  root: resolve(process.cwd(), "dev"),
  envDir: process.cwd(),
  resolve: {
    alias: {
      "@voice-input": resolve(
        process.cwd(),
        enableVoice
          ? "src/hooks/useVoiceInput.ts"
          : "src/hooks/useVoiceInput.disabled.ts"
      ),
    },
  },
  define: {
    __KRITIBOT_ENABLE_VOICE__: JSON.stringify(enableVoice),
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8012",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
