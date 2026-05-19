import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotes, saveNote, deleteNote, uploadFile } from "@/lib/api/admin.functions";
import { fileToBase64 } from "@/lib/file";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { useCategories } from "@/hooks/useSiteData";

export const Route = createFileRoute("/admin/notes")({ component: NotesAdmin });

type Note = { id: string; title: string; description: string | null; category_id: string | null; file_url: string | null; external_link: string | null; file_type: string | null };

function NotesAdmin() {
  const qc = useQueryClient();
  const { data: categories } = useCategories("note");
  const listFn = useServerFn(listNotes);
  const saveFn = useServerFn(saveNote);
  const deleteFn = useServerFn(deleteNote);
  const uploadFn = useServerFn(uploadFile);
  const { data: notes, isLoading } = useQuery({
    queryKey: ["admin_notes"],
    queryFn: () => listFn(),
  });
  const [edit, setEdit] = useState<Partial<Note> | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin_notes"] }); qc.invalidateQueries({ queryKey: ["public_notes"] }); };

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    try {
      await saveFn({
        data: {
          id: edit.id,
          title: edit.title,
          description: edit.description ?? null,
          category_id: edit.category_id || null,
          file_url: edit.file_url || null,
          external_link: edit.external_link || null,
          file_type: edit.file_type ?? "pdf",
        },
      });
      toast.success("Saved");
      setEdit(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    try {
      await deleteFn({ data: { id } });
      refresh();
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };
  const upload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadFn({
        data: { folder: "notes", filename: `${Date.now()}-${file.name}`, base64 },
      });
      setEdit({
        ...edit,
        file_url: url,
        file_type: file.name.split(".").pop()?.toLowerCase() ?? "pdf",
      });
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-3xl font-display font-bold mb-1">Notes & Study Materials</h1><p className="text-[var(--brown)]/70">PDFs and links for students.</p></div>
        <button onClick={() => setEdit({})} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2"><Plus size={16}/> New</button>
      </div>
      {edit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-display font-bold text-lg">{edit.id ? "Edit" : "New"} Note</h3><button onClick={() => setEdit(null)}><X size={18}/></button></div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Title" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })}/>
            <textarea rows={3} className="input md:col-span-2" placeholder="Description" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })}/>
            <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
              <option value="">— Category —</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="External link (optional)" value={edit.external_link ?? ""} onChange={(e) => setEdit({ ...edit, external_link: e.target.value })}/>
            <div className="md:col-span-2">
              <input type="file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}/>
              {edit.file_url && <a className="text-xs text-[var(--gold)] block mt-1" href={edit.file_url} target="_blank">file attached ({edit.file_type})</a>}
            </div>
          </div>
          <button onClick={save} className="mt-4 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold">Save</button>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-card border border-[var(--border)] overflow-hidden">
        {isLoading ? <div className="p-10 grid place-items-center"><Loader2 className="animate-spin"/></div> : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)]"><tr className="text-left"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {(notes ?? []).map((n: Note) => (
                <tr key={n.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 uppercase text-xs">{n.file_type ?? (n.external_link ? "link" : "—")}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setEdit(n)} className="text-xs px-2 py-1 rounded-lg bg-[var(--cream)] mr-2 inline-flex items-center gap-1"><Pencil size={12}/> edit</button><button onClick={() => remove(n.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 inline-flex items-center gap-1"><Trash2 size={12}/> delete</button></td>
                </tr>
              ))}
              {notes?.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-[var(--brown)]/60">No notes yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}
