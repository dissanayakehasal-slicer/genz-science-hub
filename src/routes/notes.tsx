import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotes } from "@/lib/api/public.functions";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { useCategories } from "@/hooks/useSiteData";
import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, Download, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "Notes — GEN_ZCIENCE" }, { name: "description", content: "Study notes, past papers and lesson materials." }] }),
});

function NotesPage() {
  const [cat, setCat] = useState("all");
  const { data: categories } = useCategories("note");
  const notesFn = useServerFn(getNotes);
  const { data: notes } = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesFn(),
  });
  const filtered = (notes ?? []).filter((n: any) => cat === "all" || n.category_id === cat);

  return (
    <PublicLayout>
      <PageHeader title="Notes & Lessons" subtitle="Download study materials, past papers, and short notes." />
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCat("all")} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${cat==="all" ? "bg-gradient-gold text-[var(--brown-deep)] shadow-gold" : "bg-white border border-[var(--border)]"}`}>All</button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${cat===c.id ? "bg-gradient-gold text-[var(--brown-deep)] shadow-gold" : "bg-white border border-[var(--border)]"}`}>{c.name}</button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 && <div className="col-span-full text-center py-16 text-[var(--brown)]/60">No notes yet.</div>}
          {filtered.map((n: any, i: number) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="group bg-white rounded-2xl p-6 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-gold grid place-items-center mb-4 group-hover:rotate-6 transition-transform">
                <FileText className="text-[var(--brown-deep)]" size={22} />
              </div>
              {n.category_name && <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: n.category_color }}>{n.category_name}</span>}
              <h3 className="font-display font-semibold text-lg mt-1 mb-2">{n.title}</h3>
              {n.description && <p className="text-sm text-[var(--brown)]/70 mb-4 line-clamp-3">{n.description}</p>}
              {n.file_url && (
                <a href={n.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold)] hover:underline">
                  <Download size={14}/> Download
                </a>
              )}
              {n.external_link && (
                <a href={n.external_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold)] hover:underline ml-3">
                  <ExternalLink size={14}/> Open link
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
