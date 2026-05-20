import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublishedExams, getTop10, lookupResult } from "@/lib/api/public.functions";
import { PublicLayout, PageHeader } from "@/components/PublicLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Trophy, Search, X, Award, Calendar, BookOpen, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/date";

export const Route = createFileRoute("/results")({
  component: ResultsPage,
  head: () => ({ meta: [{ title: "Results — GEN_ZCIENCE" }, { name: "description", content: "Check your exam result and see the Top 10 leaderboard." }] }),
});

function ResultsPage() {
  const [topExam, setTopExam] = useState<any>(null);
  const [lookupExam, setLookupExam] = useState<any>(null);

  const examsFn = useServerFn(getPublishedExams);
  const { data: exams, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["public-exams"],
    queryFn: () => examsFn(),
  });

  return (
    <PublicLayout>
      <PageHeader title="Exam Results" subtitle="See the latest exams, the public Top 10, and look up your personal result." />
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2"><Calendar className="text-[var(--gold)]"/> Latest Exams</h2>
        {isLoading ? (
          <motion.div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--gold)]" size={32} /></motion.div>
        ) : isError ? (
          <motion.div className="text-center py-16 max-w-md mx-auto">
            <p className="text-[var(--brown)]/80 mb-4">Could not load exams. {(error as Error)?.message ?? "Please try again."}</p>
            <button type="button" onClick={() => refetch()} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2 rounded-xl shadow-gold">
              Retry
            </button>
          </motion.div>
        ) : !exams || exams.length === 0 ? (
          <div className="text-center py-16 text-[var(--brown)]/60">No published exams yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((e: any, i: number) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-elegant transition-all">
                <div className="text-xs uppercase tracking-widest text-[var(--gold)] font-semibold mb-2">{e.class_name}</div>
                <h3 className="font-display font-bold text-xl mb-2">{e.exam_name}</h3>
                <div className="text-sm text-[var(--brown)]/70 flex gap-3 mb-4">
                  {e.subject && <span className="flex items-center gap-1"><BookOpen size={12}/> {e.subject}</span>}
                  {e.exam_date ? <span>{formatDate(e.exam_date)}</span> : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTopExam(e)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-gold text-[var(--brown-deep)] text-sm font-semibold px-3 py-2 rounded-lg shadow-gold hover:scale-105 transition-transform">
                    <Trophy size={14}/> Top 10
                  </button>
                  <button onClick={() => setLookupExam(e)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--brown-deep)] text-[var(--cream)] text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[var(--brown)]">
                    <Search size={14}/> My Result
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {topExam && <Top10Modal exam={topExam} onClose={() => setTopExam(null)} />}
        {lookupExam && <LookupModal exam={lookupExam} onClose={() => setLookupExam(null)} />}
      </AnimatePresence>
    </PublicLayout>
  );
}

function Top10Modal({ exam, onClose }: { exam: any; onClose: () => void }) {
  const top10Fn = useServerFn(getTop10);
  const { data, isLoading } = useQuery({
    queryKey: ["top10", exam.id],
    queryFn: () => top10Fn({ data: { examId: exam.id } }),
  });
  return (
    <ModalShell onClose={onClose}>
      <div className="text-xs uppercase tracking-widest text-[var(--gold)] font-semibold mb-1">Top 10 Leaderboard</div>
      <h3 className="text-2xl font-display font-bold mb-6">{exam.exam_name}</h3>
      {isLoading ? <Loader2 className="animate-spin mx-auto text-[var(--gold)]"/> : (
        <div className="space-y-2">
          {data?.length === 0 && <div className="text-center py-8 text-[var(--brown)]/60">No results yet.</div>}
          {data?.map((r: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-[var(--cream)] border border-[var(--border)]">
              <div className={`w-10 h-10 grid place-items-center rounded-full font-bold ${i<3 ? "bg-gradient-gold text-[var(--brown-deep)]" : "bg-[var(--brown-deep)] text-[var(--cream)]"}`}>
                {r.rank ?? i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{r.student_name}</div>
                {r.school && <div className="text-xs text-[var(--brown)]/70">{r.school}</div>}
                {r.grade && <div className="text-[10px] text-[var(--brown)]/50">Grade: {r.grade}</div>}
              </div>
              <div className="font-display font-bold text-lg">{Number(r.marks).toFixed(0)}</div>
            </motion.div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function LookupModal({ exam, onClose }: { exam: any; onClose: () => void }) {
  const [idx, setIdx] = useState("");
  const [submitted, setSubmitted] = useState("");
  const lookupFn = useServerFn(lookupResult);
  const { data, isFetching } = useQuery({
    queryKey: ["lookup", exam.id, submitted],
    queryFn: () => lookupFn({ data: { examId: exam.id, indexNumber: submitted } }),
    enabled: !!submitted,
  });
  return (
    <ModalShell onClose={onClose}>
      <div className="text-xs uppercase tracking-widest text-[var(--gold)] font-semibold mb-1">Result Lookup</div>
      <h3 className="text-2xl font-display font-bold mb-6">{exam.exam_name}</h3>
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(idx.trim()); }} className="flex gap-2 mb-6">
        <input value={idx} onChange={(e) => setIdx(e.target.value)} placeholder="Your index number" className="flex-1 px-4 py-3 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
        <button type="submit" className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 rounded-xl shadow-gold">Search</button>
      </form>
      {isFetching && <Loader2 className="animate-spin mx-auto text-[var(--gold)]"/>}
      {submitted && !isFetching && !data && <div className="text-center py-8 text-[var(--brown)]/60">No result found for "{submitted}".</div>}
      {data && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-brown text-[var(--cream)] rounded-2xl p-6 shadow-elegant">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-70">Student</div>
              <div className="font-display font-bold text-xl">{data.student_name}</div>
              {data.school && <div className="text-xs opacity-80">{data.school}</div>}
              <div className="text-xs opacity-70">#{data.index_number}</div>
            </div>
            <Award className="text-[var(--gold-soft)]" size={36}/>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Marks" value={Number(data.marks).toFixed(0)}/>
            <Stat label="Grade" value={data.grade ?? "—"}/>
            <Stat label="Rank" value={data.rank ?? "—"}/>
          </div>
          {data.teacher_comment && (
            <div className="mt-4 pt-4 border-t border-[var(--cream)]/20 text-sm italic opacity-90">"{data.teacher_comment}"</div>
          )}
        </motion.div>
      )}
    </ModalShell>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-[var(--brown-deep)]/40 rounded-xl py-3">
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="font-display font-bold text-2xl text-[var(--gold-soft)]">{value}</div>
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-elegant relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--cream)] grid place-items-center hover:bg-[var(--gold-soft)]"><X size={16}/></button>
        {children}
      </motion.div>
    </motion.div>
  );
}
