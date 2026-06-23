import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  listClassVideosStudent,
  listClassFilterOptions,
  getMyClassAccess,
  redeemActivationKey,
} from "@/lib/api/classes.student.functions";
import { PageHeader } from "@/components/PublicLayout";
import { formatDate } from "@/lib/date";
import { Loader2, Lock, Play, Search, Calendar, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/classes/")({
  component: ClassesIndexPage,
  head: () => ({ meta: [{ title: "Online Classes — GEN_ZCIENCE" }] }),
});

function ClassesIndexPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [keyCode, setKeyCode] = useState("");

  const listFn = useServerFn(listClassVideosStudent);
  const filtersFn = useServerFn(listClassFilterOptions);
  const accessFn = useServerFn(getMyClassAccess);
  const redeemFn = useServerFn(redeemActivationKey);

  const { data: filters } = useQuery({ queryKey: ["class-filters"], queryFn: () => filtersFn() });
  const { data: access } = useQuery({ queryKey: ["my-class-access"], queryFn: () => accessFn() });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["class-videos", page, q, subject, teacher, categoryId],
    queryFn: () =>
      listFn({
        data: {
          page,
          pageSize: 12,
          q: q || undefined,
          subject: subject || undefined,
          teacher: teacher || undefined,
          categoryId: categoryId || undefined,
        },
      }),
  });

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyCode.trim()) return;
    try {
      const res = await redeemFn({ data: { code: keyCode.trim() } });
      toast.success(`Access extended until ${formatDate(res.expires_at)}`);
      setKeyCode("");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Invalid key");
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <>
      <PageHeader title="Online Classes" subtitle="Watch recorded lessons from your science classes." />

      {access && (
        <div className="max-w-6xl mx-auto px-6 -mt-8 mb-6">
          <div
            className={`rounded-2xl px-5 py-4 text-sm flex flex-wrap items-center justify-between gap-3 ${
              access.active ? "bg-green-50 border border-green-200 text-green-900" : "bg-amber-50 border border-amber-200 text-amber-900"
            }`}
          >
            {access.active ? (
              <span>
                <strong>Access active</strong> — expires {formatDate(access.expires_at)} ({access.days_remaining} days left)
              </span>
            ) : (
              <span>
                <strong>Access expired.</strong> Renew to unlock recordings, or enter an activation key below.
              </span>
            )}
            {!access.active && (
              <form onSubmit={redeem} className="flex gap-2 items-center">
                <KeyRound size={16} />
                <input
                  value={keyCode}
                  onChange={(e) => setKeyCode(e.target.value)}
                  placeholder="Activation key"
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                />
                <button type="submit" className="px-3 py-1.5 rounded-lg bg-[var(--brown-deep)] text-white text-sm font-semibold">
                  Redeem
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-4 gap-3 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brown)]/40" size={18} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search classes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
            />
          </div>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-white border border-[var(--border)]"
          >
            <option value="">All subjects</option>
            {filters?.subjects?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={teacher}
            onChange={(e) => {
              setTeacher(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-white border border-[var(--border)]"
          >
            <option value="">All teachers</option>
            {filters?.teachers?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[var(--gold)]" size={36} />
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-20 text-[var(--brown)]/60">No class recordings yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.items.map((v: any, i: number) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-elegant transition-all"
              >
                <div className="relative aspect-video bg-[var(--cream)]">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[var(--brown)]/30">No thumbnail</div>
                  )}
                  {v.locked ? (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                      <Lock size={32} />
                    </div>
                  ) : (
                    <Link
                      to="/classes/$videoId"
                      params={{ videoId: v.id }}
                      className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Play size={40} className="text-white" />
                    </Link>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs text-[var(--gold)] font-semibold uppercase tracking-wider">{v.subject ?? "Class"}</div>
                  <h3 className="font-display font-bold text-lg mt-1 line-clamp-2">{v.title}</h3>
                  {v.teacher_name && <div className="text-xs text-[var(--brown)]/70 mt-1">{v.teacher_name}</div>}
                  {v.recorded_at && (
                    <div className="text-xs text-[var(--brown)]/50 mt-2 flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(v.recorded_at)}
                    </div>
                  )}
                  {v.locked ? (
                    <div className="mt-3 text-xs text-amber-700 font-semibold flex items-center gap-1">
                      <Lock size={12} /> Renew access to watch
                    </div>
                  ) : (
                    <Link
                      to="/classes/$videoId"
                      params={{ videoId: v.id }}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brown-deep)] hover:text-[var(--gold)]"
                    >
                      <Play size={14} /> {v.playback_position > 30 ? "Resume" : "Watch"}
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg bg-white border disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-[var(--brown)]/70">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg bg-white border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </>
  );
}
