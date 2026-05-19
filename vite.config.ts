// @lovable.dev/vite-tanstack-config bundles tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// VITE_* env injection, @ path alias, and dev error loggers. For Vercel, Cloudflare is disabled
// and Nitro is used instead (https://vercel.com/docs/frameworks/full-stack/tanstack-start).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Custom SSR error wrapper — see src/server.ts
export default defineConfig({
  cloudflare: false,
  plugins: [
    nitro({
      preset: process.env.VERCEL ? "vercel" : undefined,
    }),
  ],
  tanstackStart: {
    server: { entry: "server" },
  },
});
