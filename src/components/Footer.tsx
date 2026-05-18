import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useContactSettings, useSiteSettings, useSocialLinks } from "@/hooks/useSiteData";
import { Facebook, Youtube, Instagram, Mail, Phone, MessageCircle } from "lucide-react";

const iconMap: Record<string, any> = {
  Facebook, YouTube: Youtube, Instagram, Email: Mail, Phone, WhatsApp: MessageCircle, TikTok: MessageCircle, Telegram: MessageCircle,
};

export function Footer() {
  const { data: settings } = useSiteSettings();
  const { data: contact } = useContactSettings();
  const { data: socials } = useSocialLinks();

  return (
    <footer className="bg-gradient-brown text-[var(--cream)] mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Logo size={44} logoUrl={settings?.logo_url} />
            <div>
              <div className="font-display font-bold text-lg">{settings?.website_name ?? "GEN_ZCIENCE"}</div>
              <div className="text-xs opacity-70">{settings?.tagline ?? "Science, but make it Gen Z."}</div>
            </div>
          </div>
          <p className="text-sm opacity-80 max-w-sm">{settings?.footer_text}</p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4 text-[var(--gold-soft)]">Explore</h4>
          <ul className="space-y-2 text-sm opacity-90">
            {["notices","notes","youtube","gallery","results","contact"].map((p) => (
              <li key={p}><Link to={`/${p}`} className="hover:text-[var(--gold-soft)] capitalize">{p}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4 text-[var(--gold-soft)]">Get in touch</h4>
          <ul className="space-y-2 text-sm opacity-90">
            {contact?.phone_number && <li className="flex items-center gap-2"><Phone size={14}/> {contact.phone_number}</li>}
            {contact?.email && <li className="flex items-center gap-2"><Mail size={14}/> {contact.email}</li>}
            {contact?.address && <li className="opacity-70">{contact.address}</li>}
          </ul>
          <div className="flex gap-3 mt-4">
            {socials?.map((s) => {
              const Icon = iconMap[s.platform] ?? MessageCircle;
              return (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="w-9 h-9 grid place-items-center rounded-full bg-[var(--gold)]/20 hover:bg-[var(--gold)] hover:text-[var(--brown-deep)] transition-colors">
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--cream)]/10 py-4 text-center text-xs opacity-60">
        {settings?.footer_text ?? "© GEN_ZCIENCE"}
      </div>
    </footer>
  );
}
