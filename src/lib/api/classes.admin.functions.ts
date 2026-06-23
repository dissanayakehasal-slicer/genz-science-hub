import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { grantStudentAccess, revokeStudentAccess, logAccessEvent } from "@/lib/classes/access";
import {
  deleteClassVideo,
  uploadClassVideo as uploadVideoToStorage,
  verifyVideoExists,
} from "@/lib/classes/video-storage";
import { extractYouTubeId, youtubeThumb } from "@/lib/youtube";

const auth = [requireAuth];

const videoInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  teacher_name: z.string().nullable().optional(),
  lesson_name: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  recorded_at: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
  youtube_url: z.string().url().nullable().optional(),
});

export const getClassesDashboard = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    const [stats] = await sql`
      SELECT
        (SELECT count(*)::int FROM class_videos) AS total_videos,
        (SELECT count(*)::int FROM class_videos WHERE is_published = true) AS published_videos,
        (SELECT count(DISTINCT sa.user_id)::int FROM student_access sa
          JOIN user_roles ur ON ur.user_id = sa.user_id AND ur.role = 'student'::app_role
          WHERE sa.revoked_at IS NULL AND sa.expires_at > now()) AS active_students,
        (SELECT count(DISTINCT u.id)::int FROM app_auth_users u
          JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'::app_role
          WHERE NOT EXISTS (
            SELECT 1 FROM student_access sa
            WHERE sa.user_id = u.id AND sa.revoked_at IS NULL AND sa.expires_at > now()
          )) AS expired_students,
        (SELECT count(*)::int FROM class_videos
          WHERE created_at > now() - interval '7 days') AS recent_uploads
    `;
    return stats;
  });

export const listClassVideosAdmin = createServerFn({ method: "GET" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        q: z.string().optional(),
        subject: z.string().optional(),
        categoryId: z.string().uuid().optional(),
      })
      .parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    const offset = (data.page - 1) * data.pageSize;
    const q = data.q?.trim() ? `%${data.q.trim()}%` : null;

    const [countRow] = await sql`
      SELECT count(*)::int AS total FROM class_videos cv
      LEFT JOIN categories c ON c.id = cv.category_id
      WHERE (${q}::text IS NULL OR cv.title ILIKE ${q} OR cv.subject ILIKE ${q} OR cv.teacher_name ILIKE ${q})
        AND (${data.subject ?? null}::text IS NULL OR cv.subject = ${data.subject ?? null})
        AND (${data.categoryId ?? null}::uuid IS NULL OR cv.category_id = ${data.categoryId ?? null}::uuid)
    `;

    const rows = await sql`
      SELECT cv.*, c.name AS category_name
      FROM class_videos cv
      LEFT JOIN categories c ON c.id = cv.category_id
      WHERE (${q}::text IS NULL OR cv.title ILIKE ${q} OR cv.subject ILIKE ${q} OR cv.teacher_name ILIKE ${q})
        AND (${data.subject ?? null}::text IS NULL OR cv.subject = ${data.subject ?? null})
        AND (${data.categoryId ?? null}::uuid IS NULL OR cv.category_id = ${data.categoryId ?? null}::uuid)
      ORDER BY cv.recorded_at DESC NULLS LAST, cv.created_at DESC
      LIMIT ${data.pageSize} OFFSET ${offset}
    `;

    return { items: rows, total: (countRow as { total: number }).total, page: data.page, pageSize: data.pageSize };
  });

export const saveClassVideo = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => videoInput.parse(input))
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const youtubeId = data.youtube_url ? extractYouTubeId(data.youtube_url) : null;

    if (data.id) {
      if (youtubeId) {
        await sql`
          UPDATE class_videos SET
            title = ${data.title},
            description = ${data.description ?? null},
            subject = ${data.subject ?? null},
            teacher_name = ${data.teacher_name ?? null},
            lesson_name = ${data.lesson_name ?? null},
            category_id = ${data.category_id ?? null}::uuid,
            recorded_at = ${data.recorded_at ?? null}::timestamptz,
            is_published = ${data.is_published ?? false},
            youtube_video_id = ${youtubeId},
            video_url = ${data.youtube_url ?? null},
            storage_provider = 'youtube',
            thumbnail_url = ${youtubeThumb(youtubeId)}
          WHERE id = ${data.id}::uuid
        `;
      } else {
        await sql`
          UPDATE class_videos SET
            title = ${data.title},
            description = ${data.description ?? null},
            subject = ${data.subject ?? null},
            teacher_name = ${data.teacher_name ?? null},
            lesson_name = ${data.lesson_name ?? null},
            category_id = ${data.category_id ?? null}::uuid,
            recorded_at = ${data.recorded_at ?? null}::timestamptz,
            is_published = ${data.is_published ?? false}
          WHERE id = ${data.id}::uuid
        `;
      }
      return { ok: true, id: data.id };
    }

    const ins = await sql`
      INSERT INTO class_videos (
        title, description, subject, teacher_name, lesson_name, category_id,
        recorded_at, is_published, youtube_video_id, video_url, storage_provider, thumbnail_url
      ) VALUES (
        ${data.title}, ${data.description ?? null}, ${data.subject ?? null},
        ${data.teacher_name ?? null}, ${data.lesson_name ?? null}, ${data.category_id ?? null}::uuid,
        ${data.recorded_at ?? null}::timestamptz, ${data.is_published ?? false},
        ${youtubeId}, ${data.youtube_url ?? null},
        ${youtubeId ? "youtube" : "blob"},
        ${youtubeId ? youtubeThumb(youtubeId) : null}
      )
      RETURNING id
    `;
    await logAccessEvent({ adminId: context.userId, action: "video_created", details: { title: data.title } });
    return { ok: true, id: (ins[0] as { id: string }).id };
  });

export const uploadClassVideoFile = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        filename: z.string().min(1),
        contentType: z.string().min(1),
        base64: z.string().min(1),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        subject: z.string().nullable().optional(),
        teacher_name: z.string().nullable().optional(),
        lesson_name: z.string().nullable().optional(),
        category_id: z.string().uuid().nullable().optional(),
        recorded_at: z.string().nullable().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const buffer = Buffer.from(data.base64, "base64");
    if (buffer.length < 1024) throw new Error("Video file too small or invalid");
    const { provider, storage_key, video_url } = await uploadVideoToStorage(data.filename, buffer, data.contentType);
    const sql = getSql();

    if (data.id) {
      const [old] = await sql`SELECT storage_provider, storage_key, video_url FROM class_videos WHERE id = ${data.id}::uuid`;
      if (old) {
        await deleteClassVideo(
          (old as { storage_provider: "blob" | "r2" | "youtube" }).storage_provider,
          (old as { storage_key: string | null }).storage_key,
          (old as { video_url: string | null }).video_url
        );
      }
      await sql`
        UPDATE class_videos SET
          title = ${data.title}, description = ${data.description ?? null},
          subject = ${data.subject ?? null}, teacher_name = ${data.teacher_name ?? null},
          lesson_name = ${data.lesson_name ?? null}, category_id = ${data.category_id ?? null}::uuid,
          recorded_at = ${data.recorded_at ?? null}::timestamptz, is_published = ${data.is_published ?? true},
          storage_provider = ${provider}, storage_key = ${storage_key}, video_url = ${video_url},
          file_size_bytes = ${buffer.length}, youtube_video_id = NULL
        WHERE id = ${data.id}::uuid
      `;
      return { ok: true, id: data.id, video_url };
    }

    const ins = await sql`
      INSERT INTO class_videos (
        title, description, subject, teacher_name, lesson_name, category_id, recorded_at,
        is_published, storage_provider, storage_key, video_url, file_size_bytes
      ) VALUES (
        ${data.title}, ${data.description ?? null}, ${data.subject ?? null},
        ${data.teacher_name ?? null}, ${data.lesson_name ?? null}, ${data.category_id ?? null}::uuid,
        ${data.recorded_at ?? null}::timestamptz, ${data.is_published ?? true},
        ${provider}, ${storage_key}, ${video_url}, ${buffer.length}
      )
      RETURNING id
    `;
    await logAccessEvent({ adminId: context.userId, action: "video_uploaded", details: { title: data.title } });
    return { ok: true, id: (ins[0] as { id: string }).id, video_url };
  });

export const deleteClassVideoAdmin = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const [row] = await sql`SELECT * FROM class_videos WHERE id = ${data.id}::uuid`;
    if (!row) throw new Error("Video not found");
    const v = row as Record<string, unknown>;
    await deleteClassVideo(
      v.storage_provider as "blob" | "r2" | "youtube",
      v.storage_key as string | null,
      v.video_url as string | null
    );
    await sql`DELETE FROM class_videos WHERE id = ${data.id}::uuid`;
    await logAccessEvent({ adminId: context.userId, action: "video_deleted", details: { id: data.id } });
    return { ok: true };
  });

export const verifyClassVideos = createServerFn({ method: "POST" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    const rows = await sql`SELECT id, storage_provider, storage_key, video_url, youtube_video_id, title FROM class_videos`;
    const broken: { id: string; title: string }[] = [];
    for (const row of rows as Record<string, unknown>[]) {
      const ok = await verifyVideoExists(
        row.storage_provider as "blob" | "r2" | "youtube",
        row.storage_key as string | null,
        row.video_url as string | null,
        row.youtube_video_id as string | null
      );
      if (!ok) broken.push({ id: row.id as string, title: row.title as string });
    }
    return { broken, checked: rows.length };
  });

export const listStudentsAdmin = createServerFn({ method: "GET" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25) }).parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    const offset = (data.page - 1) * data.pageSize;
    const [countRow] = await sql`
      SELECT count(*)::int AS total FROM app_auth_users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'::app_role
    `;
    const rows = await sql`
      SELECT u.id, u.username, u.created_at, sp.display_name, sp.index_number, sp.school,
        (SELECT sa.expires_at FROM student_access sa
          WHERE sa.user_id = u.id AND sa.revoked_at IS NULL AND sa.expires_at > now()
          ORDER BY sa.expires_at DESC LIMIT 1) AS expires_at
      FROM app_auth_users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'::app_role
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT ${data.pageSize} OFFSET ${offset}
    `;
    return { items: rows, total: (countRow as { total: number }).total, page: data.page };
  });

export const createStudentAdmin = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        username: z.string().min(3).max(40),
        password: z.string().min(6).max(72),
        display_name: z.string().nullable().optional(),
        index_number: z.string().nullable().optional(),
        school: z.string().nullable().optional(),
        access_days: z.number().int().min(0).max(3650).default(30),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const sql = getSql();
    const username = data.username.toLowerCase();
    const password_hash = await bcrypt.hash(data.password, 12);
    const ins = await sql`
      INSERT INTO app_auth_users (username, password_hash) VALUES (${username}, ${password_hash})
      RETURNING id
    `;
    const userId = (ins[0] as { id: string }).id;
    await sql`INSERT INTO user_roles (user_id, role) VALUES (${userId}::uuid, 'student'::app_role)`;
    await sql`
      INSERT INTO student_profiles (user_id, display_name, index_number, school)
      VALUES (${userId}::uuid, ${data.display_name ?? null}, ${data.index_number ?? null}, ${data.school ?? null})
    `;
    if (data.access_days > 0) {
      await grantStudentAccess({ userId, days: data.access_days, adminId: context.userId, notes: "Initial access" });
    }
    return { ok: true, user_id: userId };
  });

export const grantAccessAdmin = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), days: z.number().int().min(1).max(3650), notes: z.string().optional() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const result = await grantStudentAccess({
      userId: data.user_id,
      days: data.days,
      adminId: context.userId,
      notes: data.notes,
    });
    return { ok: true, ...result };
  });

export const revokeAccessAdmin = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await revokeStudentAccess(data.user_id, context.userId);
    return { ok: true };
  });

export const listAccessLogsAdmin = createServerFn({ method: "GET" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    return sql`
      SELECT al.*, u.username AS user_username, a.username AS admin_username
      FROM access_logs al
      LEFT JOIN app_auth_users u ON u.id = al.user_id
      LEFT JOIN app_auth_users a ON a.id = al.admin_id
      WHERE (${data.userId ?? null}::uuid IS NULL OR al.user_id = ${data.userId ?? null}::uuid)
      ORDER BY al.created_at DESC
      LIMIT ${data.limit}
    `;
  });

export const createActivationKeyAdmin = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        code: z.string().min(4).max(32),
        duration_days: z.number().int().min(1).max(3650).default(30),
        max_uses: z.number().int().min(1).max(10000).default(1),
        expires_at: z.string().nullable().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const sql = getSql();
    await sql`
      INSERT INTO activation_keys (code, duration_days, max_uses, expires_at, created_by)
      VALUES (
        ${data.code.toUpperCase()},
        ${data.duration_days},
        ${data.max_uses},
        ${data.expires_at ?? null}::timestamptz,
        ${context.userId}::uuid
      )
    `;
    return { ok: true };
  });

export const listActivationKeysAdmin = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM activation_keys ORDER BY created_at DESC LIMIT 100`;
  });

export const listClassSubjects = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT DISTINCT subject FROM class_videos WHERE subject IS NOT NULL AND subject <> '' ORDER BY subject
    `;
    return rows.map((r) => (r as { subject: string }).subject);
  });
