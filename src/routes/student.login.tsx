import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/student/login")({
  component: StudentLoginPage,
  head: () => ({ meta: [{ title: "Student Login — GEN_ZCIENCE" }] }),
});

function StudentLoginPage() {
  const nav = useNavigate();
  const { isStudent, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isStudent) nav({ to: "/classes" });
  }, [isStudent, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: username.trim().toLowerCase(),
          password,
          csrfToken: await fetchCsrf(),
          callbackUrl: "/classes",
          json: "true",
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.url?.includes("error")) {
        throw new Error("Invalid username or password");
      }
      toast.success("Welcome back!");
      window.location.href = "/classes";
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero grid place-items-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-3xl shadow-elegant p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="mt-4 font-display font-bold text-2xl flex items-center gap-2">
            <GraduationCap className="text-[var(--gold)]" size={28} /> Student Login
          </h1>
          <p className="text-sm text-[var(--brown)]/70 mt-1">Access your online class recordings</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-gold text-[var(--brown-deep)] font-semibold py-3 rounded-xl shadow-gold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : "Sign in"}
          </button>
        </form>
        <p className="text-center text-xs text-[var(--brown)]/60 mt-6">
          <Link to="/" className="hover:text-[var(--gold)]">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}

async function fetchCsrf() {
  const res = await fetch("/api/auth/csrf");
  const data = await res.json();
  return data.csrfToken as string;
}
