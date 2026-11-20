import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Relative base by default; set VITE_BASE_PATH=/<repo>/ for GitHub Pages project sites.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  base: env.VITE_BASE_PATH || "./",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  };
});
