import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/contact")({ component: ContactAdmin });

function ContactAdmin() {
  const qc = useQueryClient();
  const { data: contact } = useQuery({
    queryKey: ["contact_settings"],
    queryFn: async () => (await supabase.from("contact_settings").select("*").limit(1).maybeSingle()).data,
  });
  const { data: socials } = useQuery({
    queryKey: ["social_links_admin"],
    queryFn: async () => (await supabase.from("social_links").select("*").order("sort_order")).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (contact && !form) setForm(contact); }, [contact]);
  const [busy, setBusy] = useState(false);
  const [newPlatform, setNewPlatform] = useState("Facebook");
  const [newUrl, setNewUrl] = useState("");

  const save = async () => {
    if (!form) return;
    setBusy(true);
    const { error } = await supabase.from("contact_settings").update({
      phone_number: form.phone_number, whatsapp_number_1: form.whatsapp_number_1, whatsapp_number_2: form.whatsapp_number_2,
      email: form.email, address: form.address, google_map_embed_url: form.google_map_embed_url,
    }).eq("id", form.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["contact_settings"] }); }
  };

  const addSocial = async () => {
    if (!newUrl.trim()) return;
    const { error } = await supabase.from("social_links").insert({ platform: newPlatform, url: newUrl.trim(), is_active: true });
    if (error) toast.error(error.message); else { setNewUrl(""); qc.invalidateQueries({ queryKey: ["social_links_admin"] }); qc.invalidateQueries({ queryKey: ["social_links"] }); }
  };
  const removeSocial = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("social_links").delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["social_links_admin"] }); qc.invalidateQueries({ queryKey: ["social_links"] }); }
  };

  if (!form) return <Loader2 className="animate-spin"/>;

  const F = (k: string, label: string) => (
    <div>
      <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">{label}</label>
      <input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Contact & Social</h1>
      <p className="text-[var(--brown)]/70 mb-8">Update contact info and social links shown across the site.</p>

      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mb-8">
        {F("phone_number", "Phone")}
        {F("email", "Email")}
        {F("whatsapp_number_1", "WhatsApp 1")}
        {F("whatsapp_number_2", "WhatsApp 2")}
        <div className="md:col-span-2">{F("address", "Address")}</div>
        <div className="md:col-span-2">{F("google_map_embed_url", "Google Map Embed URL")}</div>
      </div>
      <button onClick={save} disabled={busy} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-6 py-3 rounded-xl shadow-gold inline-flex items-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save
      </button>

      <h2 className="text-2xl font-display font-bold mt-12 mb-4">Social Links</h2>
      <div className="bg-white rounded-2xl p-5 shadow-card mb-4 flex flex-wrap gap-3 items-end">
        <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="px-4 py-2.5 rounded-xl border border-[var(--border)]">
          {["Facebook","YouTube","TikTok","Instagram","WhatsApp","Telegram"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-[var(--border)]" />
        <button onClick={addSocial} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2"><Plus size={16}/> Add</button>
      </div>
      <div className="space-y-2 max-w-3xl">
        {socials?.map((s: any) => (
          <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-card">
            <span className="font-semibold w-28">{s.platform}</span>
            <span className="flex-1 text-sm text-[var(--brown)]/70 truncate">{s.url}</span>
            <button onClick={() => removeSocial(s.id)} className="text-[var(--destructive)] p-2 hover:bg-[var(--destructive)]/10 rounded-lg"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
