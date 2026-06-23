import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getClassesDashboard,
  listClassVideosAdmin,
  saveClassVideo,
  uploadClassVideoFile,
  deleteClassVideoAdmin,
  verifyClassVideos,
  listStudentsAdmin,
  createStudentAdmin,
  grantAccessAdmin,
  revokeAccessAdmin,
  listAccessLogsAdmin,
  createActivationKeyAdmin,
  listActivationKeysAdmin,
  listClassSubjects,
} from "@/lib/api/classes.admin.functions";
import { useCategories } from "@/hooks/useSiteData";
import { fileToBase64 } from "@/lib/file";
import { formatDate } from "@/lib/date";
import {
  Loader2,
  Video,
  Users,
  KeyRound,
  BarChart3,
  Upload,
  Trash2,
  Pencil,
  Shield,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/admin/classes")({ component: ClassesAdmin });

type Tab = "dashboard" | "videos" | "students" | "keys" | "logs";

function ClassesAdmin() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string; Icon: typeof Video }[] = [
    { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
    { id: "videos", label: "Videos", Icon: Video },
    { id: "students", label: "Students", Icon: Users },
    { id: "keys", label: "Keys", Icon: KeyRound },
    { id: "logs", label: "Access logs", Icon: Shield },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Online Classes</h1>
      <p className="text-[var(--brown)]/70 mb-6">Manage recordings, student access, and activation keys.</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-gradient-gold text-[var(--brown-deep)] shadow-gold" : "bg-white border border-[var(--border)]"
            }`}
          >
            <t.Icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <DashboardTab />}
      {tab === "videos" && <VideosTab />}
      {tab === "students" && <StudentsTab />}
      {tab === "keys" && <KeysTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

function DashboardTab() {
  const fn = useServerFn(getClassesDashboard);
  const verifyFn = useServerFn(verifyClassVideos);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["classes-dashboard"], queryFn: () => fn() });
  const [broken, setBroken] = useState<{ id: string; title: string }[]>([]);

  const runVerify = async () => {
    const res = await verifyFn({});
    setBroken(res.broken);
    toast.success(`Checked ${res.checked} videos — ${res.broken.length} broken`);
  };

  if (isLoading) return <Loader2 className="animate-spin" />;

  const cards = [
    { label: "Total videos", value: data?.total_videos ?? 0 },
    { label: "Published", value: data?.published_videos ?? 0 },
    { label: "Active students", value: data?.active_students ?? 0 },
    { label: "Expired students", value: data?.expired_students ?? 0 },
    { label: "Uploads (7 days)", value: data?.recent_uploads ?? 0 },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-card border border-[var(--border)]">
            <div className="text-xs uppercase tracking-widest text-[var(--brown)]/60">{c.label}</div>
            <div className="text-3xl font-display font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>
      <button type="button" onClick={runVerify} className="inline-flex items-center gap-2 bg-[var(--brown-deep)] text-white px-4 py-2 rounded-xl text-sm font-semibold">
        <RefreshCw size={16} /> Verify all video files
      </button>
      {broken.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
          <strong>Broken/missing:</strong>
          <ul className="mt-2 list-disc pl-5">
            {broken.map((b) => (
              <li key={b.id}>{b.title}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" onClick={() => refetch()} className="ml-3 text-sm text-[var(--brown)]/60 underline">
        Refresh stats
      </button>
    </div>
  );
}

function VideosTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listClassVideosAdmin);
  const saveFn = useServerFn(saveClassVideo);
  const uploadFn = useServerFn(uploadClassVideoFile);
  const deleteFn = useServerFn(deleteClassVideoAdmin);
  const { data: categories } = useCategories("youtube");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-class-videos", page],
    queryFn: () => listFn({ data: { page, pageSize: 15 } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-class-videos"] });

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    setBusy(true);
    try {
      await saveFn({ data: edit });
      toast.success("Saved");
      setEdit(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadVideo = async (file: File) => {
    if (!edit?.title) return toast.error("Set title first");
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      await uploadFn({
        data: {
          id: edit.id,
          filename: file.name,
          contentType: file.type || "video/mp4",
          base64,
          title: edit.title,
          description: edit.description ?? null,
          subject: edit.subject ?? null,
          teacher_name: edit.teacher_name ?? null,
          lesson_name: edit.lesson_name ?? null,
          category_id: edit.category_id ?? null,
          recorded_at: edit.recorded_at ?? null,
          is_published: edit.is_published ?? true,
        },
      });
      toast.success("Video uploaded");
      setEdit(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this video permanently?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setEdit({ is_published: true })}
        className="mb-4 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2 rounded-xl shadow-gold"
      >
        + Add video
      </button>

      {edit && (
        <div className="bg-white rounded-2xl p-6 shadow-card border mb-6 grid md:grid-cols-2 gap-3">
          <input className="input md:col-span-2" placeholder="Title *" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          <input className="input" placeholder="Subject" value={edit.subject ?? ""} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
          <input className="input" placeholder="Teacher" value={edit.teacher_name ?? ""} onChange={(e) => setEdit({ ...edit, teacher_name: e.target.value })} />
          <input className="input" placeholder="Lesson name" value={edit.lesson_name ?? ""} onChange={(e) => setEdit({ ...edit, lesson_name: e.target.value })} />
          <input type="date" className="input" value={edit.recorded_at?.slice?.(0, 10) ?? ""} onChange={(e) => setEdit({ ...edit, recorded_at: e.target.value })} />
          <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
            <option value="">No category</option>
            {(categories as any[])?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input className="input md:col-span-2" placeholder="YouTube URL (optional)" value={edit.youtube_url ?? ""} onChange={(e) => setEdit({ ...edit, youtube_url: e.target.value })} />
          <textarea rows={2} className="input md:col-span-2" placeholder="Description" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!edit.is_published} onChange={(e) => setEdit({ ...edit, is_published: e.target.checked })} /> Published
          </label>
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-full bg-[var(--cream)] border">
            <Upload size={12} /> Upload MP4/WebM
            <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-5 py-2 rounded-xl">{busy ? "..." : "Save"}</button>
            <button type="button" onClick={() => setEdit(null)} className="px-5 py-2 rounded-xl border">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)]">
              <tr className="text-left">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((v: any) => (
                <tr key={v.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{v.title}</td>
                  <td className="px-4 py-3">{v.subject ?? "—"}</td>
                  <td className="px-4 py-3">{v.storage_provider}</td>
                  <td className="px-4 py-3">{formatDate(v.recorded_at, "—")}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button type="button" onClick={() => setEdit({ ...v, youtube_url: v.video_url })} className="p-1.5 rounded-lg bg-[var(--cream)]"><Pencil size={14} /></button>
                    <button type="button" onClick={() => remove(v.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && (
        <div className="flex gap-2 mt-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border disabled:opacity-40">Prev</button>
          <button type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border disabled:opacity-40">Next</button>
        </div>
      )}
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border);outline:none}.input:focus{box-shadow:0 0 0 2px var(--gold)}`}</style>
    </div>
  );
}

function StudentsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudentsAdmin);
  const createFn = useServerFn(createStudentAdmin);
  const grantFn = useServerFn(grantAccessAdmin);
  const revokeFn = useServerFn(revokeAccessAdmin);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", access_days: 30 });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students", page],
    queryFn: () => listFn({ data: { page } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-students"] });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({ data: form });
      toast.success("Student created");
      setForm({ username: "", password: "", display_name: "", access_days: 30 });
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const extend = async (userId: string, name: string) => {
    const days = prompt(`Extend access for ${name} by how many days?`, "30");
    if (!days || isNaN(Number(days))) return;
    try {
      await grantFn({ data: { user_id: userId, days: Number(days) } });
      toast.success("Access extended");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const revoke = async (userId: string, name: string) => {
    if (!confirm(`Revoke access for ${name}?`)) return;
    try {
      await revokeFn({ data: { user_id: userId } });
      toast.success("Access revoked");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={create} className="bg-white rounded-2xl p-6 shadow-card border mb-6 grid md:grid-cols-5 gap-3 items-end">
        <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
        <input placeholder="Display name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="input" />
        <input type="number" min={0} placeholder="Access days" value={form.access_days} onChange={(e) => setForm({ ...form, access_days: Number(e.target.value) })} className="input" />
        <button type="submit" className="bg-gradient-gold text-[var(--brown-deep)] font-semibold py-2.5 rounded-xl">Add student</button>
      </form>
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <table className="w-full text-sm bg-white rounded-2xl shadow-card overflow-hidden">
          <thead className="bg-[var(--cream)]">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((s: any) => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                <td className="px-4 py-3">{s.display_name ?? "—"}</td>
                <td className="px-4 py-3">{s.expires_at ? formatDate(s.expires_at) : <span className="text-red-600">Expired</span>}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button type="button" onClick={() => extend(s.id, s.username)} className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-800">Extend</button>
                  <button type="button" onClick={() => revoke(s.id, s.username)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style>{`.input{width:100%;padding:.625rem .85rem;border-radius:.75rem;background:#fff;border:1px solid var(--border)}`}</style>
    </div>
  );
}

function KeysTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listActivationKeysAdmin);
  const createFn = useServerFn(createActivationKeyAdmin);
  const [code, setCode] = useState("");
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({ queryKey: ["activation-keys"], queryFn: () => listFn() });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({ data: { code, duration_days: days, max_uses: 1 } });
      toast.success("Key created");
      setCode("");
      qc.invalidateQueries({ queryKey: ["activation-keys"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={create} className="flex flex-wrap gap-3 mb-6">
        <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="KEY-CODE" className="px-4 py-2 rounded-xl border uppercase" />
        <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-4 py-2 rounded-xl border w-24" />
        <button type="submit" className="bg-gradient-gold text-[var(--brown-deep)] font-semibold px-4 py-2 rounded-xl">Create key</button>
      </form>
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <table className="w-full text-sm bg-white rounded-2xl shadow-card">
          <thead className="bg-[var(--cream)]">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Days</th>
              <th className="px-4 py-3 text-left">Uses</th>
            </tr>
          </thead>
          <tbody>
            {(data as any[])?.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="px-4 py-3 font-mono">{k.code}</td>
                <td className="px-4 py-3">{k.duration_days}</td>
                <td className="px-4 py-3">{k.used_count}/{k.max_uses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LogsTab() {
  const fn = useServerFn(listAccessLogsAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["access-logs"], queryFn: () => fn({ data: { limit: 100 } }) });

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <table className="w-full text-sm bg-white rounded-2xl shadow-card">
      <thead className="bg-[var(--cream)]">
        <tr>
          <th className="px-4 py-3 text-left">When</th>
          <th className="px-4 py-3 text-left">Action</th>
          <th className="px-4 py-3 text-left">User</th>
          <th className="px-4 py-3 text-left">Admin</th>
        </tr>
      </thead>
      <tbody>
        {(data as any[])?.map((l) => (
          <tr key={l.id} className="border-t">
            <td className="px-4 py-3 text-xs">{formatDate(l.created_at)}</td>
            <td className="px-4 py-3">{l.action}</td>
            <td className="px-4 py-3">{l.user_username ?? "—"}</td>
            <td className="px-4 py-3">{l.admin_username ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
