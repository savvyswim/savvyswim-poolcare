/**
 * Standalone test config.
 *
 * The app's vite.config.ts loads the TanStack Start plugin chain, which resolves
 * React through the server ("react-server") condition — that breaks component
 * tests with "Cannot read properties of null (reading 'useRef')". Tests get a
 * plain React + jsdom setup instead.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
