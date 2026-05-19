import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSupabasePublicConfig } from "@/lib/supabase-env";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Admin Login — GEN_ZCIENCE" }] }),
});

async function userHasAdminRole(userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  const roles = (data ?? []).map((r) => r.role);
  return roles.includes("admin") || roles.includes("super_admin");
}

function LoginPage() {
  const nav = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const { url, key } = getSupabasePublicConfig();
    if (!url || !key) {
      setConfigError(
        "Supabase is not configured for this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY) in Vercel, then redeploy."
      );
    }
  }, []);

  useEffect(() => {
    if (!loading && session && isAdmin) nav({ to: "/admin" });
  }, [session, isAdmin, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configError) {
      toast.error(configError);
      return;
    }
    setBusy(true);
    try {
      const email = `${username.trim().toLowerCase()}@gmszcience.local`;
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error(
            "Invalid username or password. If this is a new deployment, run: npm run bootstrap-admin"
          );
        }
        throw error;
      }
      const userId = signInData.user?.id ?? signInData.session?.user?.id;
      if (!userId) throw new Error("Sign-in succeeded but no user session was returned.");

      const admin = await userHasAdminRole(userId);
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("This account is not an admin. Ask a super admin to grant access.");
      }

      toast.success("Welcome back!");
      nav({ to: "/admin" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Login failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-elegant p-8"
      >
        <motion.div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="mt-4 font-display font-bold text-2xl">Admin Access</h1>
          <p className="text-sm text-[var(--brown)]/70">GEN_ZCIENCE Dashboard</p>
        </motion.div>

        {configError && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {configError}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
          />
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
          />
          <button
            disabled={busy || !!configError}
            className="w-full bg-gradient-gold text-[var(--brown-deep)] font-semibold py-3 rounded-xl shadow-gold disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Sign in
          </button>
        </form>
        <Link
          to="/"
          className="block mt-4 text-center text-xs text-[var(--brown)]/60 hover:text-[var(--brown-deep)]"
        >
          ← Back to site
        </Link>
        <p className="mt-6 text-xs text-[var(--brown)]/60 text-center">
          New admins must be added by a Super Admin from the dashboard.
        </p>
      </motion.div>
    </div>
  );
}
