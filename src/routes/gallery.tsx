import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGallery } from "@/lib/api/public.functions";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { useCategories } from "@/hooks/useSiteData";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
  head: () => ({ meta: [{ title: "Gallery — GEN_ZCIENCE" }] }),
});

function GalleryPage() {
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState<any>(null);
  const { data: categories } = useCategories("gallery");
  const galleryFn = useServerFn(getGallery);
  const { data: images } = useQuery({
    queryKey: ["gallery"],
    queryFn: () => galleryFn(),
  });
  const filtered = (images ?? []).filter((g: any) => cat === "all" || g.category_id === cat);

  return (
    <PublicLayout>
      <PageHeader title="Gallery" subtitle="Moments from our classes, experiments, and events." />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCat("all")} className={`px-4 py-2 rounded-full text-sm font-semibold ${cat==="all" ? "bg-gradient-gold text-[var(--brown-deep)] shadow-gold" : "bg-white border border-[var(--border)]"}`}>All</button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`px-4 py-2 rounded-full text-sm font-semibold ${cat===c.id ? "bg-gradient-gold text-[var(--brown-deep)] shadow-gold" : "bg-white border border-[var(--border)]"}`}>{c.name}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--brown)]/60">No images yet.</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map((g: any, i: number) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 8) * 0.03 }}
                onClick={() => setLightbox(g)}
                className="block w-full break-inside-avoid rounded-2xl overflow-hidden shadow-card hover:shadow-elegant group"
              >
                <img src={g.image_url} alt={g.title ?? ""} className="w-full h-auto group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </motion.button>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-w-5xl">
              <img src={lightbox.image_url} alt={lightbox.title} className="max-h-[85vh] rounded-2xl" />
              {(lightbox.title || lightbox.caption) && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white p-6 rounded-b-2xl">
                  <h3 className="font-display font-semibold text-lg">{lightbox.title}</h3>
                  {lightbox.caption && <p className="text-sm opacity-80">{lightbox.caption}</p>}
                </div>
              )}
              <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/20 grid place-items-center text-white hover:bg-white/30"><X size={20}/></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
