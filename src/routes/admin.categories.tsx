import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesAdmin });

const TYPES = ["notice", "note", "youtube", "gallery", "exam"];

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [type, setType] = useState("notice");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#D4A017");
  const { data } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("type").order("sort_order")).data ?? [],
  });

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim(), type, color });
    if (error) toast.error(error.message); else { setName(""); qc.invalidateQueries({ queryKey: ["all-categories"] }); toast.success("Added"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["all-categories"] }); toast.success("Deleted"); }
  };

  const grouped = TYPES.map((t) => ({ type: t, items: (data ?? []).filter((c: any) => c.type === t) }));

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Categories</h1>
      <p className="text-[var(--brown)]/70 mb-8">Manage filters used across notices, notes, lessons, gallery and exams.</p>

      <div className="bg-white rounded-2xl p-6 shadow-card mb-8 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-4 py-2.5 rounded-xl border border-[var(--border)]">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)]" placeholder="e.g. Grade 11 Physics" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-16 rounded-xl border border-[var(--border)]" />
        </div>
        <button onClick={add} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2"><Plus size={16}/> Add</button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {grouped.map((g) => (
          <div key={g.type} className="bg-white rounded-2xl p-5 shadow-card border border-[var(--border)]">
            <h3 className="font-display font-semibold capitalize mb-3">{g.type}</h3>
            <div className="space-y-2">
              {g.items.length === 0 && <div className="text-sm text-[var(--brown)]/50">No categories yet.</div>}
              {g.items.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--cream)]">
                  <div className="w-4 h-4 rounded-full" style={{ background: c.color }} />
                  <div className="flex-1 text-sm font-medium">{c.name}</div>
                  <button onClick={() => remove(c.id)} className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10 p-1.5 rounded-lg"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
