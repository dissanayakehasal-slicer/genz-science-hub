import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EMAIL_DOMAIN = "gmszcience.local";
const usernameSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9_.-]+$/i, "Only letters, numbers, dot, dash, underscore");

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Only super admins can manage users");
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // any admin can view list
    const { data: me } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (me ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      throw new Error("Forbidden");
    }
    const { data: rolesRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at");
    if (error) throw error;
    const ids = Array.from(new Set((rolesRows ?? []).map((r: any) => r.user_id)));
    const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const userMap = new Map(
      (usersResp?.users ?? []).map((u: any) => [u.id, u.email as string])
    );
    const grouped = new Map<string, { user_id: string; username: string; roles: string[]; created_at: string }>();
    for (const r of rolesRows ?? []) {
      const email = userMap.get(r.user_id) ?? "";
      const username = email.replace(`@${EMAIL_DOMAIN}`, "");
      if (!grouped.has(r.user_id)) {
        grouped.set(r.user_id, { user_id: r.user_id, username, roles: [], created_at: r.created_at });
      }
      grouped.get(r.user_id)!.roles.push(r.role);
    }
    return { users: Array.from(grouped.values()), me: { userId, roles } };
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: usernameSchema,
        password: z.string().min(6).max(72),
        role: z.enum(["admin", "super_admin"]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId!);
    const email = `${data.username.toLowerCase()}@${EMAIL_DOMAIN}`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username.toLowerCase() },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;
    // remove any auto-assigned role (first-admin trigger) then set requested role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, user_id: userId, username: data.username };
  });

export const removeAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId!);
    if (data.user_id === context.userId) throw new Error("You cannot remove yourself");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId!);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
