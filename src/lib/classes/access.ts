import { getSql } from "@/lib/db";
import type { StudentAccessInfo } from "./types";

export async function getStudentAccess(userId: string): Promise<StudentAccessInfo> {
  const sql = getSql();
  const rows = await sql`
    SELECT expires_at, revoked_at
    FROM student_access
    WHERE user_id = ${userId}::uuid
      AND revoked_at IS NULL
      AND expires_at > now()
    ORDER BY expires_at DESC
    LIMIT 1
  `;
  const row = rows[0] as { expires_at: Date | string; revoked_at: string | null } | undefined;
  if (!row) {
    return { active: false, expires_at: null, days_remaining: null };
  }
  const expiresAt = row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at);
  const ms = new Date(expiresAt).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return { active: true, expires_at: expiresAt, days_remaining: daysRemaining };
}

export async function studentHasAccess(userId: string): Promise<boolean> {
  const access = await getStudentAccess(userId);
  return access.active;
}

export async function logAccessEvent(input: {
  userId?: string | null;
  adminId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO access_logs (user_id, admin_id, action, details)
    VALUES (
      ${input.userId ?? null}::uuid,
      ${input.adminId ?? null}::uuid,
      ${input.action},
      ${input.details ? JSON.stringify(input.details) : null}::jsonb
    )
  `;
}

export async function grantStudentAccess(input: {
  userId: string;
  days: number;
  adminId?: string;
  notes?: string;
}) {
  const sql = getSql();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.days);

  const active = await getStudentAccess(input.userId);
  let finalExpiry = expiresAt;
  if (active.active && active.expires_at) {
    const base = new Date(active.expires_at);
    if (base > new Date()) {
      base.setDate(base.getDate() + input.days);
      finalExpiry = base;
    }
  }

  await sql`
    INSERT INTO student_access (user_id, expires_at, granted_by, notes)
    VALUES (
      ${input.userId}::uuid,
      ${finalExpiry.toISOString()}::timestamptz,
      ${input.adminId ?? null}::uuid,
      ${input.notes ?? null}
    )
  `;

  await logAccessEvent({
    userId: input.userId,
    adminId: input.adminId,
    action: "grant_access",
    details: { days: input.days, expires_at: finalExpiry.toISOString() },
  });

  return { expires_at: finalExpiry.toISOString() };
}

export async function revokeStudentAccess(userId: string, adminId?: string) {
  const sql = getSql();
  await sql`
    UPDATE student_access
    SET revoked_at = now()
    WHERE user_id = ${userId}::uuid AND revoked_at IS NULL
  `;
  await logAccessEvent({
    userId,
    adminId,
    action: "revoke_access",
  });
}
