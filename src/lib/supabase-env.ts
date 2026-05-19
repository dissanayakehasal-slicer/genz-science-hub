/** Resolve Supabase URL + anon/publishable key across Vite, Vercel, and Lovable env names. */
export function getSupabasePublicConfig(): { url?: string; key?: string } {
  const meta = import.meta.env as Record<string, string | undefined>;

  const fromMeta = (keys: string[]) => {
    for (const key of keys) {
      const value = meta[key];
      if (value) return value;
    }
    return undefined;
  };

  const fromProcess = (keys: string[]) => {
    if (typeof process === "undefined") return undefined;
    for (const key of keys) {
      const value = process.env[key];
      if (value) return value;
    }
    return undefined;
  };

  const url =
    fromMeta(["VITE_SUPABASE_URL", "SUPABASE_URL"]) ??
    fromProcess(["VITE_SUPABASE_URL", "SUPABASE_URL"]);

  const key =
    fromMeta([
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    ]) ??
    fromProcess([
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    ]);

  return { url, key };
}

export function requireSupabasePublicConfig(): { url: string; key: string } {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL (or VITE_SUPABASE_URL)"] : []),
      ...(!key
        ? ["SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY)"]
        : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Add them in Vercel project settings and redeploy.`
    );
  }
  return { url, key };
}
