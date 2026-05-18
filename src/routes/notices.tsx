import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { useCategories } from "@/hooks/useSiteData";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Paperclip, Star, Calendar } from "lucide-react";

export const Route = createFileRoute("/notices")({
  component: NoticesPage,
  head: () => ({ meta: [{ title: "Notices — GEN_ZCIENCE" }, { name: "description", content: "Latest class notices and updates." }] }),
});

function NoticesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const { data: categories } = useCategories("notice");
  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data } = await supabase.from("notices").select("*, categories(name,color)").order("publish_date", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (notices ?? []).filter((n: any) => {
    if (cat !== "all" && n.category_id !== cat) return false;
    if (q && !n.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <PublicLayout>
      <PageHeader title="Notices" subtitle="Stay up to date with class announcements and important updates." />
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brown)]/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notices..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white border border-[var(--border)]">
            <option value="all">All categories</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="grid gap-4">{Array.from({length:3}).map((_,i) => <div key={i} className="h-32 rounded-2xl bg-white/60 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--brown)]/60">No notices found.</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((n: any, i: number) => (
              <motion.article
                key={n.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-elegant transition-all border-l-4"
                style={{ borderLeftColor: n.categories?.color ?? "var(--gold)" }}
              >
                <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs">
                    {n.categories && <span className="px-2.5 py-1 rounded-full font-semibold text-[var(--brown-deep)]" style={{ background: `${n.categories.color}33` }}>{n.categories.name}</span>}
                    {n.is_important && <span className="inline-flex items-center gap-1 text-[var(--destructive)] font-semibold"><Star size={12} fill="currentColor"/> Important</span>}
                  </div>
                  <div className="text-xs text-[var(--brown)]/60 flex items-center gap-1"><Calendar size={12}/> {new Date(n.publish_date).toLocaleDateString()}</div>
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">{n.title}</h3>
                {n.description && <p className="text-[var(--brown)]/80 text-sm whitespace-pre-line">{n.description}</p>}
                {n.attachment_url && (
                  <a href={n.attachment_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold)] hover:underline">
                    <Paperclip size={14}/> View attachment
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
