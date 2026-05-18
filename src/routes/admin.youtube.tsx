import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Star } from "lucide-react";
import { useCategories } from "@/hooks/useSiteData";
import { extractYouTubeId } from "@/lib/youtube";

export const Route = createFileRoute("/admin/youtube")({ component: YouTubeAdmin });

type Lesson = { id: string; title: string; description: string | null; youtube_url: string; youtube_video_id: string | null; playlist_id: string | null; category_id: string | null; is_featured: boolean };
type Playlist = { id: string; title: string; description: string | null; sort_order: number };

function YouTubeAdmin() {
  const qc = useQueryClient();
  const { data: categories } = useCategories("lesson");
  const { data: playlists } = useQuery({ queryKey: ["admin_playlists"], queryFn: async () => (await supabase.from("youtube_playlists").select("*").order("sort_order")).data ?? [] });
  const { data: lessons, isLoading } = useQuery({ queryKey: ["admin_lessons"], queryFn: async () => (await supabase.from("youtube_lessons").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [edit, setEdit] = useState<Partial<Lesson> | null>(null);
  const [newPlaylist, setNewPlaylist] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin_lessons"] }); qc.invalidateQueries({ queryKey: ["admin_playlists"] }); qc.invalidateQueries({ queryKey: ["public_lessons"] }); qc.invalidateQueries({ queryKey: ["featured-lesson"] }); };

  const save = async () => {
    if (!edit?.title || !edit.youtube_url) return toast.error("Title & URL required");
    const vid = extractYouTubeId(edit.youtube_url);
    if (!vid) return toast.error("Invalid YouTube URL");
    const payload = { title: edit.title, description: edit.description ?? null, youtube_url: edit.youtube_url, youtube_video_id: vid, playlist_id: edit.playlist_id || null, category_id: edit.category_id || null, is_featured: !!edit.is_featured };
    const { error } = edit.id ? await supabase.from("youtube_lessons").update(payload).eq("id", edit.id) : await supabase.from("youtube_lessons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEdit(null); refresh();
  };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("youtube_lessons").delete().eq("id", id); refresh(); };
  const addPlaylist = async () => {
    if (!newPlaylist) return;
    const { error } = await supabase.from("youtube_playlists").insert({ title: newPlaylist });
    if (error) return toast.error(error.message);
    setNewPlaylist(""); refresh();
  };
  const removePlaylist = async (id: string) => { if (!confirm("Delete playlist? Lessons will become unassigned.")) return; await supabase.from("youtube_playlists").delete().eq("id", id); refresh(); };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-1">YouTube Lessons</h1>
      <p className="text-[var(--brown)]/70 mb-6">Manage playlists and embedded video lessons.</p>

      <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
        <h3 className="font-display font-bold mb-3">Playlists</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {(playlists as Playlist[] | undefined)?.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 bg-[var(--cream)] px-3 py-1.5 rounded-full text-sm">{p.title} <button onClick={() => removePlaylist(p.id)}><X size={12}/></button></span>
          ))}
        </div>
        <div className="flex gap-2"><input className="input flex-1" placeholder="New playlist name" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)}/><button onClick={addPlaylist} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 rounded-xl">Add</button></div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setEdit({})} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2"><Plus size={16}/> New Lesson</button>
      </div>

      {edit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-display font-bold text-lg">{edit.id ? "Edit" : "New"} Lesson</h3><button onClick={() => setEdit(null)}><X size={18}/></button></div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Title" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })}/>
            <input className="input md:col-span-2" placeholder="YouTube URL" value={edit.youtube_url ?? ""} onChange={(e) => setEdit({ ...edit, youtube_url: e.target.value })}/>
            <textarea rows={3} className="input md:col-span-2" placeholder="Description" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })}/>
            <select className="input" value={edit.playlist_id ?? ""} onChange={(e) => setEdit({ ...edit, playlist_id: e.target.value || null })}>
              <option value="">— Playlist —</option>{(playlists as Playlist[] | undefined)?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
              <option value="">— Category —</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={!!edit.is_featured} onChange={(e) => setEdit({ ...edit, is_featured: e.target.checked })}/> Featured on homepage</label>
          </div>
          <button onClick={save} className="mt-4 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold">Save</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-[var(--border)] overflow-hidden">
        {isLoading ? <div className="p-10 grid place-items-center"><Loader2 className="animate-spin"/></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {(lessons ?? []).map((l: Lesson) => (
              <div key={l.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--cream)]">
                {l.youtube_video_id && <img src={`https://i.ytimg.com/vi/${l.youtube_video_id}/hqdefault.jpg`} className="w-full aspect-video object-cover" alt=""/>}
                <div className="p-3">
                  <div className="font-semibold text-sm line-clamp-2 mb-2">{l.title} {l.is_featured && <Star size={12} className="inline text-[var(--gold)] fill-[var(--gold)]"/>}</div>
                  <div className="flex gap-2"><button onClick={() => setEdit(l)} className="text-xs px-2 py-1 rounded-lg bg-white border border-[var(--border)] inline-flex items-center gap-1"><Pencil size={12}/> edit</button><button onClick={() => remove(l.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 inline-flex items-center gap-1"><Trash2 size={12}/> delete</button></div>
                </div>
              </div>
            ))}
            {lessons?.length === 0 && <div className="col-span-full text-center py-10 text-[var(--brown)]/60">No lessons yet.</div>}
          </div>
        )}
      </div>
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}
