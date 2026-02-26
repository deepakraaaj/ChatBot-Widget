import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const packageVersion = process.env.npm_package_version || "0.0.0";
const enableSourceMap = process.env.KRITIBOT_SOURCEMAP === "true";

export default defineConfig({
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __KRITIBOT_WIDGET_VERSION__: JSON.stringify(packageVersion),
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
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: enableSourceMap,
    lib: {
      entry: "src/embed.tsx",
      name: "KritiBot",
      formats: ["iife"],
      fileName: () => "kritibot-widget.js",
    },
  },
});
