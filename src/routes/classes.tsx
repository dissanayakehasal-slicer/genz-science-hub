import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/classes")({
  beforeLoad: ({ context }) => {
    const roles = context.session?.user?.roles ?? [];
    const isStudent = roles.includes("student");
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    if (!context.session?.user || (!isStudent && !isAdmin)) {
      throw redirect({ to: "/student/login" });
    }
  },
  component: ClassesLayout,
});

function ClassesLayout() {
  const { username, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-[var(--gold)]" size={32} />
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="bg-[var(--brown-deep)] text-[var(--cream)] px-4 py-2 flex items-center justify-between text-sm">
        <span>
          Online Classes {username ? `· ${username}` : ""}
          {isAdmin && <span className="ml-2 opacity-70">(admin preview)</span>}
        </span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin/classes" className="hover:text-[var(--gold-soft)]">
              Manage
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/signout?callbackUrl=/";
            }}
            className="inline-flex items-center gap-1 hover:text-[var(--gold-soft)]"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
      <Outlet />
    </PublicLayout>
  );
}
