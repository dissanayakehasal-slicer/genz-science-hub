import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { requireStudent, requireAdminOrStudent } from "@/lib/auth-middleware";
import { getStudentAccess, grantStudentAccess, logAccessEvent, studentHasAccess } from "@/lib/classes/access";
import { getStreamableUrl } from "@/lib/classes/video-storage";

export const getMyClassAccess = createServerFn({ method: "GET" })
  .middleware([requireAdminOrStudent])
  .handler(async ({ context }) => {
    const isAdmin = context.roles.includes("admin") || context.roles.includes("super_admin");
    if (isAdmin) return { active: true, expires_at: null, days_remaining: null };
    return getStudentAccess(context.userId);
  });

export const listClassVideosStudent = createServerFn({ method: "GET" })
  .middleware([requireAdminOrStudent])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
        q: z.string().optional(),
        subject: z.string().optional(),
        teacher: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const isAdmin = context.roles.includes("admin") || context.roles.includes("super_admin");
    const hasAccess = isAdmin || (await studentHasAccess(context.userId));
    const offset = (data.page - 1) * data.pageSize;
    const q = data.q?.trim() ? `%${data.q.trim()}%` : null;

    const [countRow] = await sql`
      SELECT count(*)::int AS total FROM class_videos cv
      WHERE cv.is_published = true
        AND (${q}::text IS NULL OR cv.title ILIKE ${q} OR cv.subject ILIKE ${q} OR cv.teacher_name ILIKE ${q} OR cv.lesson_name ILIKE ${q})
        AND (${data.subject ?? null}::text IS NULL OR cv.subject = ${data.subject ?? null})
        AND (${data.teacher ?? null}::text IS NULL OR cv.teacher_name ILIKE ${data.teacher ? `%${data.teacher}%` : null})
        AND (${data.categoryId ?? null}::uuid IS NULL OR cv.category_id = ${data.categoryId ?? null}::uuid)
        AND (${data.dateFrom ?? null}::timestamptz IS NULL OR cv.recorded_at >= ${data.dateFrom ?? null}::timestamptz)
        AND (${data.dateTo ?? null}::timestamptz IS NULL OR cv.recorded_at <= ${data.dateTo ?? null}::timestamptz)
    `;

    const rows = await sql`
      SELECT cv.id, cv.title, cv.description, cv.subject, cv.teacher_name, cv.lesson_name,
             cv.thumbnail_url, cv.recorded_at, cv.duration_seconds, cv.storage_provider,
             c.name AS category_name,
             vp.position_seconds AS playback_position
      FROM class_videos cv
      LEFT JOIN categories c ON c.id = cv.category_id
      LEFT JOIN video_playback vp ON vp.video_id = cv.id AND vp.user_id = ${context.userId}::uuid
      WHERE cv.is_published = true
        AND (${q}::text IS NULL OR cv.title ILIKE ${q} OR cv.subject ILIKE ${q} OR cv.teacher_name ILIKE ${q} OR cv.lesson_name ILIKE ${q})
        AND (${data.subject ?? null}::text IS NULL OR cv.subject = ${data.subject ?? null})
        AND (${data.teacher ?? null}::text IS NULL OR cv.teacher_name ILIKE ${data.teacher ? `%${data.teacher}%` : null})
        AND (${data.categoryId ?? null}::uuid IS NULL OR cv.category_id = ${data.categoryId ?? null}::uuid)
        AND (${data.dateFrom ?? null}::timestamptz IS NULL OR cv.recorded_at >= ${data.dateFrom ?? null}::timestamptz)
        AND (${data.dateTo ?? null}::timestamptz IS NULL OR cv.recorded_at <= ${data.dateTo ?? null}::timestamptz)
      ORDER BY cv.recorded_at DESC NULLS LAST, cv.created_at DESC
      LIMIT ${data.pageSize} OFFSET ${offset}
    `;

    const access = isAdmin ? { active: true, expires_at: null, days_remaining: null } : await getStudentAccess(context.userId);

    return {
      items: (rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        locked: !hasAccess,
      })),
      total: (countRow as { total: number }).total,
      page: data.page,
      pageSize: data.pageSize,
      access,
    };
  });

export const getClassVideoStudent = createServerFn({ method: "GET" })
  .middleware([requireAdminOrStudent])
  .inputValidator((input) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const isAdmin = context.roles.includes("admin") || context.roles.includes("super_admin");
    const hasAccess = isAdmin || (await studentHasAccess(context.userId));

    const rows = await sql`
      SELECT cv.*, c.name AS category_name,
             vp.position_seconds AS playback_position
      FROM class_videos cv
      LEFT JOIN categories c ON c.id = cv.category_id
      LEFT JOIN video_playback vp ON vp.video_id = cv.id AND vp.user_id = ${context.userId}::uuid
      WHERE cv.id = ${data.videoId}::uuid AND cv.is_published = true
      LIMIT 1
    `;
    const video = rows[0] as Record<string, unknown> | undefined;
    if (!video) throw new Error("Video not found");

    const locked = !hasAccess;
    let stream_url: string | null = null;
    if (!locked) {
      stream_url = await getStreamableUrl(
        video.storage_provider as "youtube" | "blob" | "r2",
        video.video_url as string | null,
        video.youtube_video_id as string | null
      );
    }

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      subject: video.subject,
      teacher_name: video.teacher_name,
      lesson_name: video.lesson_name,
      category_name: video.category_name,
      thumbnail_url: video.thumbnail_url,
      recorded_at: video.recorded_at,
      duration_seconds: video.duration_seconds,
      storage_provider: video.storage_provider,
      playback_position: video.playback_position ?? 0,
      locked,
      stream_url,
      access: isAdmin ? { active: true, expires_at: null, days_remaining: null } : await getStudentAccess(context.userId),
    };
  });

export const savePlaybackProgress = createServerFn({ method: "POST" })
  .middleware([requireAdminOrStudent])
  .inputValidator((input) =>
    z.object({ videoId: z.string().uuid(), positionSeconds: z.number().int().min(0) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const isAdmin = context.roles.includes("admin") || context.roles.includes("super_admin");
    if (!isAdmin && !(await studentHasAccess(context.userId))) {
      throw new Error("Access expired");
    }
    const sql = getSql();
    await sql`
      INSERT INTO video_playback (user_id, video_id, position_seconds, updated_at)
      VALUES (${context.userId}::uuid, ${data.videoId}::uuid, ${data.positionSeconds}, now())
      ON CONFLICT (user_id, video_id)
      DO UPDATE SET position_seconds = ${data.positionSeconds}, updated_at = now()
    `;
    return { ok: true };
  });

export const redeemActivationKey = createServerFn({ method: "POST" })
  .middleware([requireStudent])
  .inputValidator((input) => z.object({ code: z.string().min(4).max(32) }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const code = data.code.trim().toUpperCase();
    const rows = await sql`
      SELECT * FROM activation_keys WHERE code = ${code} LIMIT 1
    `;
    const key = rows[0] as Record<string, unknown> | undefined;
    if (!key) throw new Error("Invalid activation key");
    if (key.expires_at && new Date(String(key.expires_at)) < new Date()) {
      throw new Error("This activation key has expired");
    }
    if ((key.used_count as number) >= (key.max_uses as number)) {
      throw new Error("This activation key has reached its use limit");
    }

    const existing = await sql`
      SELECT 1 FROM activation_key_redemptions
      WHERE key_id = ${key.id}::uuid AND user_id = ${context.userId}::uuid
    `;
    if (existing.length) throw new Error("You already used this key");

    const result = await grantStudentAccess({
      userId: context.userId,
      days: key.duration_days as number,
      notes: `Key: ${code}`,
    });

    await sql`
      UPDATE activation_keys SET used_count = used_count + 1 WHERE id = ${key.id}::uuid
    `;
    await sql`
      INSERT INTO activation_key_redemptions (key_id, user_id) VALUES (${key.id}::uuid, ${context.userId}::uuid)
    `;
    await logAccessEvent({
      userId: context.userId,
      action: "redeem_key",
      details: { code, expires_at: result.expires_at },
    });

    return { ok: true, expires_at: result.expires_at };
  });

export const listClassFilterOptions = createServerFn({ method: "GET" })
  .middleware([requireAdminOrStudent])
  .handler(async () => {
    const sql = getSql();
    const [subjects, teachers, categories] = await Promise.all([
      sql`SELECT DISTINCT subject FROM class_videos WHERE is_published = true AND subject IS NOT NULL ORDER BY subject`,
      sql`SELECT DISTINCT teacher_name FROM class_videos WHERE is_published = true AND teacher_name IS NOT NULL ORDER BY teacher_name`,
      sql`SELECT DISTINCT c.id, c.name FROM categories c JOIN class_videos cv ON cv.category_id = c.id WHERE cv.is_published = true ORDER BY c.name`,
    ]);
    return {
      subjects: subjects.map((r) => (r as { subject: string }).subject),
      teachers: teachers.map((r) => (r as { teacher_name: string }).teacher_name),
      categories,
    };
  });
