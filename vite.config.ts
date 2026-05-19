// @lovable.dev/vite-tanstack-config bundles tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// VITE_* env injection, @ path alias, and dev error loggers. For Vercel, Cloudflare is disabled
// and Nitro is used instead (https://vercel.com/docs/frameworks/full-stack/tanstack-start).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

/** Mirror non-VITE Supabase vars into the client bundle (Vercel often sets SUPABASE_* only). */
function supabaseClientEnvDefine(): Record<string, string> {
  const define: Record<string, string> = {};
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (url && !process.env.VITE_SUPABASE_URL) {
    define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);
  }
  if (key && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);
  }
  return define;
}

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
  vite: {
    define: supabaseClientEnvDefine(),
  },
});
