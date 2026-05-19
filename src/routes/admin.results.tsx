import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listExams,
  saveExam,
  toggleExamPublish,
  deleteExam,
  listResults,
  recalculateRanks,
  insertResult,
  insertResultsBulk,
  deleteResult,
} from "@/lib/api/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Upload, Eye, EyeOff, Trophy } from "lucide-react";

export const Route = createFileRoute("/admin/results")({ component: ResultsAdmin });

type Exam = { id: string; exam_name: string; exam_date: string | null; class_name: string | null; subject: string | null; description: string | null; is_published: boolean };
type Result = { id: string; exam_id: string; student_name: string; school: string | null; index_number: string; marks: number; grade: string | null; rank: number | null; teacher_comment: string | null };

function ResultsAdmin() {
  const qc = useQueryClient();
  const listExamsFn = useServerFn(listExams);
  const saveExamFn = useServerFn(saveExam);
  const togglePublishFn = useServerFn(toggleExamPublish);
  const deleteExamFn = useServerFn(deleteExam);
  const { data: exams, isLoading } = useQuery({
    queryKey: ["admin_exams"],
    queryFn: () => listExamsFn(),
  });
  const [examEdit, setExamEdit] = useState<Partial<Exam> | null>(null);
  const [openExam, setOpenExam] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_exams"] });

  const handleSaveExam = async () => {
    if (!examEdit?.exam_name) return toast.error("Name required");
    try {
      await saveExamFn({
        data: {
          id: examEdit.id,
          exam_name: examEdit.exam_name,
          exam_date: examEdit.exam_date || null,
          class_name: examEdit.class_name ?? null,
          subject: examEdit.subject ?? null,
          description: examEdit.description ?? null,
          is_published: !!examEdit.is_published,
        },
      });
      toast.success("Saved");
      setExamEdit(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };
  const togglePublish = async (e: Exam) => {
    try {
      await togglePublishFn({ data: { id: e.id, is_published: !e.is_published } });
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };
  const removeExam = async (id: string) => {
    if (!confirm("Delete exam and all results?")) return;
    try {
      await deleteExamFn({ data: { id } });
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-3xl font-display font-bold mb-1">Results</h1><p className="text-[var(--brown)]/70">Manage exams and upload student marks.</p></div>
        <button onClick={() => setExamEdit({ is_published: false })} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2.5 rounded-xl shadow-gold inline-flex items-center gap-2"><Plus size={16}/> New Exam</button>
      </div>

      {examEdit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-6">
          <div className="flex justify-between mb-4"><h3 className="font-display font-bold">{examEdit.id ? "Edit" : "New"} Exam</h3><button onClick={() => setExamEdit(null)}><X size={18}/></button></div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input md:col-span-2" placeholder="Exam name" value={examEdit.exam_name ?? ""} onChange={(e) => setExamEdit({ ...examEdit, exam_name: e.target.value })}/>
            <input type="date" className="input" value={examEdit.exam_date ?? ""} onChange={(e) => setExamEdit({ ...examEdit, exam_date: e.target.value })}/>
            <input className="input" placeholder="Class" value={examEdit.class_name ?? ""} onChange={(e) => setExamEdit({ ...examEdit, class_name: e.target.value })}/>
            <input className="input" placeholder="Subject" value={examEdit.subject ?? ""} onChange={(e) => setExamEdit({ ...examEdit, subject: e.target.value })}/>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!examEdit.is_published} onChange={(e) => setExamEdit({ ...examEdit, is_published: e.target.checked })}/> Published</label>
            <textarea rows={2} className="input md:col-span-2" placeholder="Description" value={examEdit.description ?? ""} onChange={(e) => setExamEdit({ ...examEdit, description: e.target.value })}/>
          </div>
          <button onClick={handleSaveExam} className="mt-4 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2.5 rounded-xl shadow-gold">Save</button>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? <Loader2 className="animate-spin"/> : (exams as Exam[] | undefined)?.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl shadow-card border border-[var(--border)] overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2"><Trophy size={14} className="text-[var(--gold)]"/> {e.exam_name}</div>
                <div className="text-xs text-[var(--brown)]/60">{e.exam_date ?? "no date"} · {e.subject ?? ""} · {e.class_name ?? ""}</div>
              </div>
              <button onClick={() => togglePublish(e)} className={`text-xs px-3 py-1.5 rounded-full ${e.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"} inline-flex items-center gap-1`}>{e.is_published ? <Eye size={12}/> : <EyeOff size={12}/>}{e.is_published ? "published" : "draft"}</button>
              <button onClick={() => setOpenExam(openExam === e.id ? null : e.id)} className="text-xs px-3 py-1.5 rounded-full bg-[var(--cream)] hover:bg-[var(--gold-soft)]/40">{openExam === e.id ? "close" : "manage results"}</button>
              <button onClick={() => setExamEdit(e)} className="text-xs px-2 py-1 rounded-lg bg-[var(--cream)]"><Pencil size={12}/></button>
              <button onClick={() => removeExam(e.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700"><Trash2 size={12}/></button>
            </div>
            {openExam === e.id && <ResultsTable examId={e.id} />}
          </div>
        ))}
      </div>
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}

function ResultsTable({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listResults);
  const recalcFn = useServerFn(recalculateRanks);
  const insertFn = useServerFn(insertResult);
  const bulkFn = useServerFn(insertResultsBulk);
  const deleteFn = useServerFn(deleteResult);
  const { data, isLoading } = useQuery({
    queryKey: ["results", examId],
    queryFn: () => listFn({ data: { examId } }),
  });
  const [form, setForm] = useState<Partial<Result>>({});
  const refresh = async () => {
    await recalcFn({ data: { examId } });
    qc.invalidateQueries({ queryKey: ["results", examId] });
  };

  const add = async () => {
    if (!form.student_name || !form.index_number || form.marks === undefined) return toast.error("Name, index & marks required");
    try {
      await insertFn({
        data: {
          exam_id: examId,
          student_name: form.student_name,
          index_number: form.index_number,
          school: form.school ?? null,
          marks: Number(form.marks),
          grade: form.grade ?? null,
          teacher_comment: form.teacher_comment ?? null,
        },
      });
      setForm({});
      await refresh();
      toast.success("Added");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const csvUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows = lines
      .slice(1)
      .map((l) => {
        const [index_number, school, grade, student_name, marks, teacher_comment] = l
          .split(",")
          .map((s) => s.trim());
        return {
          student_name,
          index_number,
          school: school || null,
          grade: grade || null,
          marks: Number(marks),
          teacher_comment: teacher_comment || null,
        };
      })
      .filter((r) => r.student_name && r.index_number && !isNaN(r.marks));
    if (!rows.length) return toast.error("No valid rows");
    try {
      await bulkFn({ data: { exam_id: examId, rows } });
      await refresh();
      toast.success(`Imported ${rows.length}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <div className="border-t border-[var(--border)] p-4 bg-[var(--cream)]/40">
      <div className="grid md:grid-cols-7 gap-2 mb-3">
        <input className="input" placeholder="Index #" value={form.index_number ?? ""} onChange={(e) => setForm({ ...form, index_number: e.target.value })}/>
        <input className="input" placeholder="School" value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })}/>
        <input className="input" placeholder="Grade" value={form.grade ?? ""} onChange={(e) => setForm({ ...form, grade: e.target.value })}/>
        <input className="input md:col-span-2" placeholder="Student name" value={form.student_name ?? ""} onChange={(e) => setForm({ ...form, student_name: e.target.value })}/>
        <input type="number" className="input" placeholder="Marks" value={form.marks ?? ""} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}/>
        <button onClick={add} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold rounded-xl">Add</button>
      </div>
      <label className="inline-flex items-center gap-2 text-xs cursor-pointer mb-3 px-3 py-2 rounded-full bg-white border border-[var(--border)]">
        <Upload size={12}/> Import CSV (index,school,grade,name,marks,comment)
        <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && csvUpload(e.target.files[0])}/>
      </label>
      {isLoading ? <Loader2 className="animate-spin"/> : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden">
          <thead className="bg-[var(--cream)]"><tr className="text-left"><th className="px-3 py-2">Rank</th><th className="px-3 py-2">Index</th><th className="px-3 py-2">School</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Marks</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>
            {(data as Result[] | undefined)?.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]"><td className="px-3 py-2 font-bold">{r.rank ?? "-"}</td><td className="px-3 py-2 font-mono text-xs">{r.index_number}</td><td className="px-3 py-2">{r.school ?? "-"}</td><td className="px-3 py-2">{r.grade ?? "-"}</td><td className="px-3 py-2">{r.student_name}</td><td className="px-3 py-2">{r.marks}</td><td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className="text-xs text-red-600"><Trash2 size={12}/></button></td></tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-[var(--brown)]/60">No results yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
