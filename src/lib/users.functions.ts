import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const usernameSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9_.-]+$/i, "Only letters, numbers, dot, dash, underscore");

async function assertSuperAdmin(roles: string[]) {
  if (!roles.includes("super_admin")) {
    throw new Error("Only super admins can manage users");
  }
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { roles, userId } = context;
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      throw new Error("Forbidden");
    }

    const { data: rolesRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at");
    if (error) throw error;

    const ids = Array.from(new Set((rolesRows ?? []).map((r) => r.user_id)));
    const { data: users, error: usersErr } = await supabaseAdmin
      .from("app_auth_users")
      .select("id, username, created_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (usersErr) throw usersErr;

    const userMap = new Map((users ?? []).map((u) => [u.id, u.username]));
    const grouped = new Map<
      string,
      { user_id: string; username: string; roles: string[]; created_at: string }
    >();

    for (const r of rolesRows ?? []) {
      const username = userMap.get(r.user_id) ?? "unknown";
      if (!grouped.has(r.user_id)) {
        grouped.set(r.user_id, {
          user_id: r.user_id,
          username,
          roles: [],
          created_at: r.created_at,
        });
      }
      grouped.get(r.user_id)!.roles.push(r.role);
    }

    return { users: Array.from(grouped.values()), me: { userId, roles } };
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    await assertSuperAdmin(context.roles);
    const username = data.username.toLowerCase();
    const password_hash = await bcrypt.hash(data.password, 12);

    const { data: created, error } = await supabaseAdmin
      .from("app_auth_users")
      .insert({ username, password_hash })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const userId = created.id;
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    return { ok: true, user_id: userId, username };
  });

export const removeAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.roles);
    if (data.user_id === context.userId) throw new Error("You cannot remove yourself");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("app_auth_users").delete().eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.roles);
    const password_hash = await bcrypt.hash(data.password, 12);
    const { error } = await supabaseAdmin
      .from("app_auth_users")
      .update({ password_hash })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
