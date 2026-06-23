import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-middleware";
import { getSql } from "@/lib/db";
import type { AppRole } from "@/utils/auth";

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

    const sql = getSql();
    const rolesRows = await sql`SELECT user_id, role, created_at FROM user_roles`;
    const users = await sql`SELECT id, username, created_at FROM app_auth_users`;

    const userMap = new Map(
      (users as { id: string; username: string }[]).map((u) => [u.id, u.username])
    );
    const grouped = new Map<
      string,
      { user_id: string; username: string; roles: string[]; created_at: string }
    >();

    for (const r of rolesRows as { user_id: string; role: string; created_at: string }[]) {
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

    return {
      users: Array.from(grouped.values()).filter((u) =>
        u.roles.some((r) => r === "admin" || r === "super_admin")
      ),
      me: { userId, roles },
    };
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
    const sql = getSql();
    const username = data.username.toLowerCase();
    const password_hash = await bcrypt.hash(data.password, 12);

    const ins = await sql`
      INSERT INTO app_auth_users (username, password_hash) VALUES (${username}, ${password_hash})
      RETURNING id
    `;
    const userId = (ins[0] as { id: string }).id;
    await sql`INSERT INTO user_roles (user_id, role) VALUES (${userId}::uuid, ${data.role}::app_role)`;
    return { ok: true, user_id: userId, username };
  });

async function targetHasRole(userId: string, role: AppRole) {
  const sql = getSql();
  const rows = await sql`
    SELECT 1 FROM user_roles
    WHERE user_id = ${userId}::uuid AND role = ${role}::app_role
    LIMIT 1
  `;
  return rows.length > 0;
}

export const removeAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.roles);
    if (data.user_id === context.userId) throw new Error("You cannot remove yourself");
    if (await targetHasRole(data.user_id, "super_admin")) {
      throw new Error("Cannot remove a super admin. Reset their password instead if needed.");
    }
    const sql = getSql();
    await sql`DELETE FROM user_roles WHERE user_id = ${data.user_id}::uuid`;
    await sql`DELETE FROM app_auth_users WHERE id = ${data.user_id}::uuid`;
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.roles);
    if (data.user_id === context.userId) {
      throw new Error("Use Site Settings to change your own password.");
    }

    const sql = getSql();
    const existing = await sql`
      SELECT id, username FROM app_auth_users WHERE id = ${data.user_id}::uuid LIMIT 1
    `;
    if (!existing.length) {
      throw new Error("User not found. They may only exist as an env-based login.");
    }

    const password_hash = await bcrypt.hash(data.password, 12);
    const updated = await sql`
      UPDATE app_auth_users SET password_hash = ${password_hash} WHERE id = ${data.user_id}::uuid
      RETURNING id
    `;
    if (!updated.length) {
      throw new Error("Password update failed");
    }
    return { ok: true, username: (existing[0] as { username: string }).username };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input) =>
    z
      .object({
        current_password: z.string().min(1).max(72),
        new_password: z.string().min(6).max(72),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, username, password_hash FROM app_auth_users
      WHERE id = ${context.userId}::uuid
      LIMIT 1
    `;
    const user = rows[0] as { id: string; username: string; password_hash: string } | undefined;

    if (!user) {
      throw new Error(
        "No database login found for this account. Ask a super admin to reset your password under Admin Users."
      );
    }

    const valid = await bcrypt.compare(data.current_password, user.password_hash);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    const same = await bcrypt.compare(data.new_password, user.password_hash);
    if (same) {
      throw new Error("New password must be different from your current password");
    }

    const password_hash = await bcrypt.hash(data.new_password, 12);
    await sql`UPDATE app_auth_users SET password_hash = ${password_hash} WHERE id = ${context.userId}::uuid`;
    return { ok: true };
  });
