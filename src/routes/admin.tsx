import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LayoutDashboard, Bell, FileText, Youtube, Image, Trophy, Tags, Settings, Phone, LogOut, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems: Array<{ to: string; label: string; Icon: any; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/admin/notices", label: "Notices", Icon: Bell },
  { to: "/admin/notes", label: "Notes", Icon: FileText },
  { to: "/admin/youtube", label: "YouTube", Icon: Youtube },
  { to: "/admin/gallery", label: "Gallery", Icon: Image },
  { to: "/admin/results", label: "Results", Icon: Trophy },
  { to: "/admin/categories", label: "Categories", Icon: Tags },
  { to: "/admin/contact", label: "Contact & Social", Icon: Phone },
  { to: "/admin/settings", label: "Site Settings", Icon: Settings },
];

function AdminLayout() {
  const nav = useNavigate();
  const { session, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!session || !isAdmin)) nav({ to: "/login" });
  }, [session, isAdmin, loading, nav]);

  if (loading || !session || !isAdmin) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-[var(--gold)]" size={32}/></div>;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex bg-[var(--cream)]">
      <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-64 bg-gradient-brown text-[var(--cream)] p-4 hidden lg:flex flex-col sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-3 mb-8 px-2">
          <Logo size={40} />
          <div>
            <div className="font-display font-bold">GEN_ZCIENCE</div>
            <div className="text-xs opacity-70">Admin</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {navItems.map((i) => (
            <Link key={i.to} to={i.to as any} activeOptions={{ exact: i.exact }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--gold)]/15 transition-colors"
              activeProps={{ className: "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-gold text-[var(--brown-deep)] shadow-gold" }}>
              <i.Icon size={18}/> {i.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--destructive)]/20">
          <LogOut size={18}/> Sign out
        </button>
      </motion.aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-gradient-brown text-[var(--cream)] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2"><Logo size={32}/> <span className="font-semibold">Admin</span></div>
          <button onClick={signOut}><LogOut size={18}/></button>
        </div>
        <div className="lg:hidden overflow-x-auto bg-white border-b border-[var(--border)] px-2 py-2 flex gap-1 sticky top-[60px] z-20">
          {navItems.map((i) => (
            <Link key={i.to} to={i.to as any} activeOptions={{ exact: i.exact }} className="whitespace-nowrap px-3 py-1.5 text-xs rounded-full bg-[var(--cream)]"
              activeProps={{ className: "whitespace-nowrap px-3 py-1.5 text-xs rounded-full bg-gradient-gold text-[var(--brown-deep)] font-semibold" }}>
              {i.label}
            </Link>
          ))}
        </div>

        <motion.main key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 lg:p-10 max-w-7xl">
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
