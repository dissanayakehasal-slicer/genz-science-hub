import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Star, Pencil, X } from "lucide-react";
import { useCategories } from "@/hooks/useSiteData";

export const Route = createFileRoute("/admin/notices")({ component: NoticesAdmin });

type Notice = {
  id: string; title: string; description: string | null; category_id: string | null;
  attachment_url: string | null; is_important: boolean; publish_date: string;
};

function NoticesAdmin() {
  const qc = useQueryClient();
  const { data: categories } = useCategories("notice");
  const { data: notices, isLoading } = useQuery({
    queryKey: ["admin_notices"],
    queryFn: async () => (await supabase.from("notices").select("*").order("publish_date", { ascending: false })).data ?? [],
  });
  const [edit, setEdit] = useState<Partial<Notice> | null>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin_notices"] }); qc.invalidateQueries({ queryKey: ["public_notices"] }); qc.invalidateQueries({ queryKey: ["latest-notice"] }); };

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    const payload = {
      title: edit.title, description: edit.description ?? null,
      category_id: edit.category_id || null, attachment_url: edit.attachment_url || null,
      is_important: !!edit.is_important, publish_date: edit.publish_date || new Date().toISOString(),
    };
    const { error } = edit.id
      ? await supabase.from("notices").update(payload).eq("id", edit.id)
      : await supabase.from("notices").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEdit(null); refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refresh();
  };

  const upload = async (file: File) => {
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("notice-attachments").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("notice-attachments").getPublicUrl(path);
    setEdit({ ...edit, attachment_url: data.publicUrl }); toast.success("Uploaded");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Notices</h1>
          <p className="text-[var(--brown)]/70">Announcements shown on the Notices page.</p>
        </div>
        <button onClick={() => setEdit({ is_important: false, publish_date: new Date().toISOString() })} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2">
          <Plus size={16}/> New Notice
        </button>
      </div>

      {edit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">{edit.id ? "Edit" : "New"} Notice</h3>
            <button onClick={() => setEdit(null)}><X size={18}/></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Title" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })}/>
            <textarea rows={4} className="input md:col-span-2" placeholder="Description" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })}/>
            <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
              <option value="">— Category —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="datetime-local" className="input" value={edit.publish_date ? new Date(edit.publish_date).toISOString().slice(0,16) : ""} onChange={(e) => setEdit({ ...edit, publish_date: new Date(e.target.value).toISOString() })}/>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.is_important} onChange={(e) => setEdit({ ...edit, is_important: e.target.checked })}/> Important</label>
            <div>
              <input type="file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}/>
              {edit.attachment_url && <a className="text-xs text-[var(--gold)] block mt-1" href={edit.attachment_url} target="_blank">attached</a>}
            </div>
          </div>
          <button onClick={save} className="mt-4 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold">Save</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-[var(--border)] overflow-hidden">
        {isLoading ? <div className="p-10 grid place-items-center"><Loader2 className="animate-spin"/></div> : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)]"><tr className="text-left"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Important</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {(notices ?? []).map((n: Notice) => (
                <tr key={n.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-[var(--brown)]/70">{new Date(n.publish_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{n.is_important && <Star size={14} className="text-[var(--gold)] fill-[var(--gold)]"/>}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEdit(n)} className="text-xs px-2 py-1 rounded-lg bg-[var(--cream)] hover:bg-[var(--gold-soft)]/40 mr-2 inline-flex items-center gap-1"><Pencil size={12}/> edit</button>
                    <button onClick={() => remove(n.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 inline-flex items-center gap-1"><Trash2 size={12}/> delete</button>
                  </td>
                </tr>
              ))}
              {notices?.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-[var(--brown)]/60">No notices yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}
