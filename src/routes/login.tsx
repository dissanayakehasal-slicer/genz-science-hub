import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Admin Login — GEN_ZCIENCE" }] }),
});

function LoginPage() {
  const nav = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) nav({ to: "/admin" });
  }, [session, isAdmin, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const email = `${username.trim().toLowerCase()}@gmszcience.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (e: any) {
      toast.error(e.message ?? "Login failed");
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
        <div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="mt-4 font-display font-bold text-2xl">Admin Access</h1>
          <p className="text-sm text-[var(--brown)]/70">GEN_ZCIENCE Dashboard</p>
        </div>
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
            disabled={busy}
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
