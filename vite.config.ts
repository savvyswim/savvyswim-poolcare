// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      // Rolldown currently drops the createMiddleware declaration from
      // TanStack's CSRF module while retaining its call sites in the Worker
      // bundle. Disabling tree-shaking preserves the required declaration.
      rollupOptions: {
        treeshake: false,
      },
    },
    server: {
      watch: {
        // Env files are rewritten by the platform on every sync. Watching them
        // makes Vite full-restart the dev server, which drops in-flight requests
        // and makes the preview intermittently fail to load.
        ignored: ["**/.env", "**/.env.*"],
      },
    },
  },
});
