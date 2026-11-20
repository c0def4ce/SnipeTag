import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Standard ESM only — no node:path / process / __dirname, so this builds even
// when @types/node is not installed.
const srcDir = decodeURIComponent(new URL("./src", import.meta.url).pathname)
  .replace(/^\/([A-Za-z]:)/, "$1");

// Relative base by default; set VITE_BASE_PATH=/<repo>/ for GitHub Pages project sites.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: env.VITE_BASE_PATH || "./",
    plugins: [react()],
    resolve: {
      alias: { "@": srcDir },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
