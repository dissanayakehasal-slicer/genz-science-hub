import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Loader2, ShieldCheck } from "lucide-react";
import { getSupabasePublicConfig } from "@/lib/supabase-env";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.session?.user) {
      throw redirect({ to: "/admin" });
    }
  },
  component: LoginPage,
  head: () => ({ meta: [{ title: "Admin Login — GEN_ZCIENCE" }] }),
});

function LoginPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const { url, key } = getSupabasePublicConfig();
    if (!url || !key) {
      setConfigError(
        "Supabase data keys are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY on Vercel, then redeploy."
      );
    }
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken ?? ""))
      .catch(() => setConfigError("Auth service is not available. Check AUTH_SECRET on Vercel and redeploy."));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-hero grid place-items-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-elegant p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="mt-4 font-display font-bold text-2xl">Admin Access</h1>
          <p className="text-sm text-[var(--brown)]/70">GEN_ZCIENCE Dashboard</p>
        </div>

        {configError && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {configError}
          </p>
        )}

        {!csrfToken && !configError ? (
          <motion.div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[var(--gold)]" size={28} />
          </motion.div>
        ) : (
          <form action="/api/auth/callback/credentials" method="POST" className="space-y-3">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value="/admin" />
            <input
              required
              autoFocus
              autoComplete="username"
              name="username"
              placeholder="Username"
              className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
            />
            <input
              required
              type="password"
              autoComplete="current-password"
              name="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!!configError}
              className="w-full bg-gradient-gold text-[var(--brown-deep)] font-semibold py-3 rounded-xl shadow-gold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Sign in
            </button>
          </form>
        )}

        <Link
          to="/"
          className="block mt-4 text-center text-xs text-[var(--brown)]/60 hover:text-[var(--brown-deep)]"
        >
          ← Back to site
        </Link>
        <p className="mt-6 text-xs text-[var(--brown)]/60 text-center">
          Admin login uses Auth.js. If you cannot access the Lovable Supabase project, set{" "}
          <code className="text-[10px]">ADMIN_USERNAME</code> and{" "}
          <code className="text-[10px]">ADMIN_PASSWORD</code> on Vercel.
        </p>
      </div>
    </motion.div>
  );
}
