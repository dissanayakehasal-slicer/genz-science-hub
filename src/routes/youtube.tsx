import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { extractYouTubeId, youtubeThumb } from "@/lib/youtube";
import { Play, Star } from "lucide-react";

export const Route = createFileRoute("/youtube")({
  component: YouTubePage,
  head: () => ({ meta: [{ title: "YouTube Lessons — GEN_ZCIENCE" }] }),
});

function YouTubePage() {
  const [active, setActive] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: playlists } = useQuery({
    queryKey: ["yt-playlists"],
    queryFn: async () => (await supabase.from("youtube_playlists").select("*").order("sort_order")).data ?? [],
  });
  const { data: lessons } = useQuery({
    queryKey: ["yt-lessons"],
    queryFn: async () => (await supabase.from("youtube_lessons").select("*, youtube_playlists(title)").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => (lessons ?? []).filter((l: any) => {
    if (playlist !== "all" && l.playlist_id !== playlist) return false;
    if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [lessons, playlist, q]);

  return (
    <PublicLayout>
      <PageHeader title="YouTube Lessons" subtitle="Watch every lesson, revision and experiment in one place." />
      <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-1">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons..." className="w-full mb-4 px-4 py-2.5 rounded-xl bg-white border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
          <button onClick={() => setPlaylist("all")} className={`block w-full text-left px-4 py-2.5 rounded-xl font-medium ${playlist==="all" ? "bg-gradient-gold text-[var(--brown-deep)]" : "hover:bg-white"}`}>All Lessons</button>
          {playlists?.map((p: any) => (
            <button key={p.id} onClick={() => setPlaylist(p.id)} className={`block w-full text-left px-4 py-2.5 rounded-xl font-medium ${playlist===p.id ? "bg-gradient-gold text-[var(--brown-deep)]" : "hover:bg-white"}`}>{p.title}</button>
          ))}
        </aside>

        <div>
          {active && (
            <motion.div layout className="aspect-video mb-8 rounded-2xl overflow-hidden shadow-elegant">
              <iframe src={`https://www.youtube.com/embed/${active}?autoplay=1`} title="lesson" className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </motion.div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.length === 0 && <div className="col-span-full text-center py-16 text-[var(--brown)]/60">No lessons yet.</div>}
            {filtered.map((l: any, i: number) => {
              const id = l.youtube_video_id || extractYouTubeId(l.youtube_url);
              return (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => id && setActive(id)}
                  className="text-left bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all group"
                >
                  <div className="relative aspect-video bg-[var(--brown-deep)]">
                    {id && <img src={youtubeThumb(id)} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />}
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-gradient-gold grid place-items-center"><Play className="text-[var(--brown-deep)] ml-1" fill="currentColor" /></div>
                    </div>
                    {l.is_featured && <div className="absolute top-2 left-2 bg-gradient-gold text-[var(--brown-deep)] text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Star size={10} fill="currentColor"/> Featured</div>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2">{l.title}</h3>
                    {l.youtube_playlists && <div className="text-xs text-[var(--brown)]/60 mt-1">{l.youtube_playlists.title}</div>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
