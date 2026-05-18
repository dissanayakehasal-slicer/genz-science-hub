import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { useContactSettings, useSocialLinks } from "@/hooks/useSiteData";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Youtube, Instagram, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({ meta: [{ title: "Contact — GEN_ZCIENCE" }] }),
});

const iconMap: Record<string, any> = { WhatsApp: MessageCircle, Facebook, YouTube: Youtube, Instagram, TikTok: MessageCircle, Telegram: Send, Email: Mail, Phone };

function ContactPage() {
  const { data: contact } = useContactSettings();
  const { data: socials } = useSocialLinks();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const sendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const num = contact?.whatsapp_number_1?.replace(/\D/g, "");
    if (!num) { toast.error("No WhatsApp number configured"); return; }
    const text = encodeURIComponent(`Hi! I'm ${form.name} (${form.email}).\n\n${form.message}`);
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  };

  return (
    <PublicLayout>
      <PageHeader title="Get in Touch" subtitle="Reach out anytime — we'll reply on WhatsApp." />
      <section className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
          {contact?.phone_number && <InfoCard Icon={Phone} label="Phone" value={contact.phone_number} href={`tel:${contact.phone_number}`} />}
          {contact?.whatsapp_number_1 && <InfoCard Icon={MessageCircle} label="WhatsApp" value={contact.whatsapp_number_1} href={`https://wa.me/${contact.whatsapp_number_1.replace(/\D/g,"")}`} />}
          {contact?.email && <InfoCard Icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />}
          {contact?.address && <InfoCard Icon={MapPin} label="Location" value={contact.address} />}

          {socials && socials.length > 0 && (
            <div className="pt-4">
              <div className="text-xs uppercase tracking-widest text-[var(--brown)]/60 mb-3">Follow us</div>
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => {
                  const Icon = iconMap[s.platform] ?? MessageCircle;
                  return (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-card hover:shadow-elegant hover:bg-gradient-gold hover:text-[var(--brown-deep)] transition-all text-sm font-semibold">
                      <Icon size={14}/> {s.platform}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {contact?.google_map_embed_url && (
            <div className="rounded-2xl overflow-hidden shadow-card aspect-video mt-4">
              <iframe src={contact.google_map_embed_url} className="w-full h-full" loading="lazy" title="Map" />
            </div>
          )}
        </motion.div>

        <motion.form onSubmit={sendWhatsApp} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 shadow-elegant space-y-4">
          <h2 className="text-2xl font-display font-bold">Send a message</h2>
          <p className="text-sm text-[var(--brown)]/70">Fill in your details — we'll open WhatsApp with your message ready.</p>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
          <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message" className="w-full px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none resize-none" />
          <button className="w-full bg-gradient-gold text-[var(--brown-deep)] font-semibold py-3 rounded-xl shadow-gold hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-2">
            <Send size={16}/> Send via WhatsApp
          </button>
        </motion.form>
      </section>
    </PublicLayout>
  );
}

function InfoCard({ Icon, label, value, href }: { Icon: any; label: string; value: string; href?: string }) {
  const Body = (
    <>
      <div className="w-11 h-11 rounded-xl bg-gradient-gold grid place-items-center"><Icon className="text-[var(--brown-deep)]" size={20}/></div>
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--brown)]/60">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-card hover:shadow-elegant transition-all">{Body}</a>
  ) : (
    <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-card">{Body}</div>
  );
}
