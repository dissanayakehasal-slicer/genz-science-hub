import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { useSiteSettings } from "@/hooks/useSiteData";

const links = [
  { to: "/", label: "Home" },
  { to: "/notices", label: "Notices" },
  { to: "/notes", label: "Notes" },
  { to: "/youtube", label: "Lessons" },
  { to: "/gallery", label: "Gallery" },
  { to: "/results", label: "Results" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "glass shadow-card" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={40} logoUrl={settings?.logo_url} />
          <div className="leading-tight">
            <div className="font-display font-bold text-base tracking-tight">{settings?.website_name ?? "GEN_ZCIENCE"}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--brown)]">{settings?.teacher_short_name ?? "GSM"}</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[var(--gold-soft)]/40"
              activeProps={{ className: "px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--gold-soft)]/60 text-[var(--brown-deep)]" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden lg:inline-flex bg-gradient-gold text-[var(--brown-deep)] font-semibold text-sm px-4 py-2 rounded-lg shadow-gold hover:scale-105 transition-transform">
            Admin
          </Link>
          <button className="lg:hidden p-2" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="lg:hidden glass border-t border-[var(--border)]">
          <div className="px-4 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="px-4 py-3 rounded-lg hover:bg-[var(--gold-soft)]/40 font-medium">
                {l.label}
              </Link>
            ))}
            <Link to="/login" className="mt-2 text-center bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-3 rounded-lg">
              Admin
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
