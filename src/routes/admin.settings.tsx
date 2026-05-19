import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveSiteSettings, uploadFile } from "@/lib/api/admin.functions";
import { useSiteSettings } from "@/hooks/useSiteData";
import { fileToBase64 } from "@/lib/file";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: SettingsAdmin });

function SettingsAdmin() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveSiteSettings);
  const uploadFn = useServerFn(uploadFile);
  const { data } = useSiteSettings();
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !form) setForm(data); }, [data]);

  if (!form) return <Loader2 className="animate-spin"/>;

  const save = async () => {
    setBusy(true);
    try {
      await saveFn({
        data: {
          website_name: form.website_name,
          tagline: form.tagline,
          hero_title: form.hero_title,
          hero_description: form.hero_description,
          teacher_name: form.teacher_name,
          teacher_short_name: form.teacher_short_name,
          teacher_bio: form.teacher_bio,
          teacher_slogan: form.teacher_slogan,
          teacher_photo_url: form.teacher_photo_url,
          class_description: form.class_description,
          logo_url: form.logo_url,
          banner_url: form.banner_url,
          footer_text: form.footer_text,
        },
      });
      toast.success("Saved!");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (
    file: File,
    folder: "teacher-photos" | "logos",
    field: string
  ) => {
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadFn({
        data: { folder, filename: `${Date.now()}-${file.name}`, base64 },
      });
      setForm({ ...form, [field]: url });
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  };

  const F = (k: string, label: string, type: "text" | "textarea" = "text") => (
    <div>
      <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">{label}</label>
      {type === "textarea" ? (
        <textarea rows={3} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
      ) : (
        <input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Site Settings</h1>
      <p className="text-[var(--brown)]/70 mb-8">Update what appears on the public homepage.</p>
      <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
        {F("website_name", "Website Name")}
        {F("tagline", "Tagline")}
        {F("hero_title", "Hero Title")}
        {F("hero_description", "Hero Description", "textarea")}
        {F("teacher_name", "Teacher Name")}
        {F("teacher_short_name", "Teacher Short Name (GMS)")}
        {F("teacher_slogan", "Teacher Slogan (under name on home)")}
        <div className="md:col-span-2">{F("teacher_bio", "Teacher Bio", "textarea")}</div>
        <div className="md:col-span-2">{F("class_description", "Class Description", "textarea")}</div>
        {F("footer_text", "Footer Text")}

        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Teacher Photo</label>
          {form.teacher_photo_url && <img src={form.teacher_photo_url} alt="" className="w-24 h-24 rounded-xl object-cover mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "teacher-photos", "teacher_photo_url")} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Logo (GMS)</label>
          {form.logo_url && <img src={form.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logos", "logo_url")} />
        </div>
      </div>
      <button onClick={save} disabled={busy} className="mt-8 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-6 py-3 rounded-xl shadow-gold inline-flex items-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Changes
      </button>
    </div>
  );
}
