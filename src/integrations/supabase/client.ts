import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { requireSupabasePublicConfig } from "@/lib/supabase-env";

function createSupabaseClient() {
  const { url, key } = requireSupabasePublicConfig();

  return createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
