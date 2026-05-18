import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, X } from "lucide-react";
import { useCategories } from "@/hooks/useSiteData";

export const Route = createFileRoute("/admin/gallery")({ component: GalleryAdmin });
type Img = { id: string; title: string | null; caption: string | null; image_url: string; category_id: string | null };

function GalleryAdmin() {
  const qc = useQueryClient();
  const { data: categories } = useCategories("gallery");
  const { data: images, isLoading } = useQuery({ queryKey: ["admin_gallery"], queryFn: async () => (await supabase.from("gallery_images").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Img | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin_gallery"] }); qc.invalidateQueries({ queryKey: ["public_gallery"] }); };

  const uploadMany = async (files: FileList) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("gallery").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("gallery").getPublicUrl(path);
      await supabase.from("gallery_images").insert({ image_url: data.publicUrl, title: file.name });
    }
    setBusy(false); refresh(); toast.success("Uploaded");
  };

  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("gallery_images").delete().eq("id", id); refresh(); };

  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.from("gallery_images").update({ title: edit.title, caption: edit.caption, category_id: edit.category_id }).eq("id", edit.id);
    if (error) return toast.error(error.message);
    setEdit(null); refresh(); toast.success("Saved");
  };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-1">Gallery</h1>
      <p className="text-[var(--brown)]/70 mb-6">Upload class photos. Click any image to edit its caption or category.</p>

      <label className="block bg-white rounded-2xl p-8 shadow-card border-2 border-dashed border-[var(--gold)]/40 text-center cursor-pointer mb-6 hover:bg-[var(--gold-soft)]/20 transition">
        <Upload className="mx-auto text-[var(--gold)] mb-2" size={28}/>
        <div className="font-semibold">{busy ? "Uploading..." : "Click to upload images"}</div>
        <div className="text-xs text-[var(--brown)]/60 mt-1">You can select multiple files</div>
        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadMany(e.target.files)}/>
      </label>

      {edit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-display font-bold">Edit Image</h3><button onClick={() => setEdit(null)}><X size={18}/></button></div>
          <div className="grid md:grid-cols-2 gap-4">
            <img src={edit.image_url} className="rounded-xl aspect-video object-cover"/>
            <div className="space-y-3">
              <input className="input" placeholder="Title" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })}/>
              <textarea rows={3} className="input" placeholder="Caption" value={edit.caption ?? ""} onChange={(e) => setEdit({ ...edit, caption: e.target.value })}/>
              <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
                <option value="">— Category —</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={saveEdit} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold">Save</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <Loader2 className="animate-spin"/> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(images as Img[] | undefined)?.map((img) => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden bg-white shadow-card cursor-pointer" onClick={() => setEdit(img)}>
              <img src={img.image_url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"/>
              <button onClick={(e) => { e.stopPropagation(); remove(img.id); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
              {img.title && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 truncate">{img.title}</div>}
            </div>
          ))}
          {images?.length === 0 && <div className="col-span-full text-center py-10 text-[var(--brown)]/60">No images yet.</div>}
        </div>
      )}
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}
