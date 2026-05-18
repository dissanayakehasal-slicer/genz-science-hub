import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, KeyRound, ShieldCheck, Shield } from "lucide-react";
import {
  listAdminUsers,
  createAdminUser,
  removeAdminUser,
  setUserPassword,
} from "@/lib/users.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/users")({ component: UsersAdmin });

function UsersAdmin() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const fetchList = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);
  const removeFn = useServerFn(removeAdminUser);
  const pwFn = useServerFn(setUserPassword);

  const { data, isLoading } = useQuery({ queryKey: ["admin_users"], queryFn: () => fetchList() });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_users"] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: { username, password, role } });
      toast.success(`User ${username} created`);
      setUsername(""); setPassword(""); setRole("admin");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(false); }
  };

  const handleRemove = async (user_id: string, uname: string) => {
    if (!confirm(`Remove ${uname}? This deletes their login.`)) return;
    try { await removeFn({ data: { user_id } }); toast.success("Removed"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handlePw = async (user_id: string, uname: string) => {
    const pw = prompt(`New password for ${uname}:`);
    if (!pw || pw.length < 6) return toast.error("Min 6 chars");
    try { await pwFn({ data: { user_id, password: pw } }); toast.success("Password updated"); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Admin Users</h1>
      <p className="text-[var(--brown)]/70 mb-8">
        {isSuperAdmin
          ? "Create and manage admins and super admins."
          : "View admins. Only super admins can add or remove users."}
      </p>

      {isSuperAdmin && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)] mb-8 grid md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Username</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Password</label>
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--cream)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--gold)] focus:outline-none" />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs uppercase tracking-widest text-[var(--brown)]/60 font-semibold mb-1 block">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--cream)] border border-[var(--border)]">
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <button disabled={busy} className="bg-gradient-gold text-[var(--brown-deep)] font-semibold py-2.5 rounded-xl shadow-gold inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} Add user
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <div className="p-10 grid place-items-center"><Loader2 className="animate-spin text-[var(--gold)]" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)]">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((u) => {
                const isSuper = u.roles.includes("super_admin");
                return (
                  <tr key={u.user_id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{u.username || "—"}</td>
                    <td className="px-4 py-3">
                      {u.roles.map((r) => (
                        <span key={r} className={`inline-flex items-center gap-1 text-xs font-semibold mr-1 px-2 py-1 rounded-full ${r === "super_admin" ? "bg-gradient-gold text-[var(--brown-deep)]" : "bg-[var(--gold-soft)]/60 text-[var(--brown-deep)]"}`}>
                          {r === "super_admin" ? <ShieldCheck size={12} /> : <Shield size={12} />} {r}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-[var(--brown)]/70">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {isSuperAdmin && u.user_id !== data?.me.userId && (
                        <div className="inline-flex gap-2">
                          <button onClick={() => handlePw(u.user_id, u.username)} className="text-xs px-2 py-1 rounded-lg bg-[var(--cream)] hover:bg-[var(--gold-soft)]/40 inline-flex items-center gap-1"><KeyRound size={12}/> reset pw</button>
                          <button onClick={() => handleRemove(u.user_id, u.username)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"><Trash2 size={12}/> remove</button>
                        </div>
                      )}
                      {u.user_id === data?.me.userId && <span className="text-xs text-[var(--brown)]/50">(you)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
