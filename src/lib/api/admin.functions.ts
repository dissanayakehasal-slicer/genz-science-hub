import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { uploadPublicFile, type StorageFolder } from "@/lib/storage";
import { requireAuth } from "@/lib/auth-middleware";
import { extractYouTubeId } from "@/lib/youtube";

const auth = [requireAuth];

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    const [row] = await sql`
      SELECT
        (SELECT count(*)::int FROM notices) AS notices,
        (SELECT count(*)::int FROM notes) AS notes,
        (SELECT count(*)::int FROM gallery_images) AS gallery,
        (SELECT count(*)::int FROM youtube_lessons) AS lessons,
        (SELECT count(*)::int FROM exams) AS exams,
        (SELECT count(*)::int FROM results) AS results
    `;
    return row;
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM categories ORDER BY type, sort_order`;
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ name: z.string().min(1), type: z.string(), color: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      INSERT INTO categories (name, type, color) VALUES (${data.name}, ${data.type}, ${data.color ?? "#D4A017"})
    `;
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM categories WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listNotices = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM notices ORDER BY publish_date DESC`;
  });

export const saveNotice = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        category_id: z.string().uuid().nullable().optional(),
        attachment_url: z.string().nullable().optional(),
        is_important: z.boolean(),
        publish_date: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    if (data.id) {
      await sql`
        UPDATE notices SET
          title = ${data.title}, description = ${data.description ?? null},
          category_id = ${data.category_id ?? null}, attachment_url = ${data.attachment_url ?? null},
          is_important = ${data.is_important}, publish_date = ${data.publish_date}::timestamptz,
          updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } else {
      await sql`
        INSERT INTO notices (title, description, category_id, attachment_url, is_important, publish_date)
        VALUES (${data.title}, ${data.description ?? null}, ${data.category_id ?? null},
                ${data.attachment_url ?? null}, ${data.is_important}, ${data.publish_date}::timestamptz)
      `;
    }
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM notices WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM notes ORDER BY created_at DESC`;
  });

export const saveNote = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        category_id: z.string().uuid().nullable().optional(),
        file_url: z.string().nullable().optional(),
        external_link: z.string().nullable().optional(),
        file_type: z.string().nullable().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    if (data.id) {
      await sql`
        UPDATE notes SET title = ${data.title}, description = ${data.description ?? null},
          category_id = ${data.category_id ?? null}, file_url = ${data.file_url ?? null},
          external_link = ${data.external_link ?? null}, file_type = ${data.file_type ?? null},
          updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } else {
      await sql`
        INSERT INTO notes (title, description, category_id, file_url, external_link, file_type)
        VALUES (${data.title}, ${data.description ?? null}, ${data.category_id ?? null},
                ${data.file_url ?? null}, ${data.external_link ?? null}, ${data.file_type ?? null})
      `;
    }
    return { ok: true };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM notes WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listGallery = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM gallery_images ORDER BY created_at DESC`;
  });

export const insertGalleryImage = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ image_url: z.string().url(), title: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      INSERT INTO gallery_images (image_url, title) VALUES (${data.image_url}, ${data.title ?? null})
    `;
    return { ok: true };
  });

export const updateGalleryImage = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().nullable().optional(),
        caption: z.string().nullable().optional(),
        category_id: z.string().uuid().nullable().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      UPDATE gallery_images SET title = ${data.title ?? null}, caption = ${data.caption ?? null},
        category_id = ${data.category_id ?? null}, updated_at = now()
      WHERE id = ${data.id}::uuid
    `;
    return { ok: true };
  });

export const deleteGalleryImage = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM gallery_images WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listPlaylists = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM youtube_playlists ORDER BY sort_order`;
  });

export const listLessons = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM youtube_lessons ORDER BY created_at DESC`;
  });

export const saveLesson = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        youtube_url: z.string().url(),
        playlist_id: z.string().uuid().nullable().optional(),
        category_id: z.string().uuid().nullable().optional(),
        is_featured: z.boolean(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    const videoId = extractYouTubeId(data.youtube_url);
    if (data.id) {
      await sql`
        UPDATE youtube_lessons SET title = ${data.title}, description = ${data.description ?? null},
          youtube_url = ${data.youtube_url}, youtube_video_id = ${videoId},
          playlist_id = ${data.playlist_id ?? null}, category_id = ${data.category_id ?? null},
          is_featured = ${data.is_featured}, updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } else {
      await sql`
        INSERT INTO youtube_lessons (title, description, youtube_url, youtube_video_id, playlist_id, category_id, is_featured)
        VALUES (${data.title}, ${data.description ?? null}, ${data.youtube_url}, ${videoId},
                ${data.playlist_id ?? null}, ${data.category_id ?? null}, ${data.is_featured})
      `;
    }
    return { ok: true };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM youtube_lessons WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const savePlaylist = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ title: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`INSERT INTO youtube_playlists (title) VALUES (${data.title})`;
    return { ok: true };
  });

export const deletePlaylist = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM youtube_playlists WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listExams = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM exams ORDER BY exam_date DESC NULLS LAST`;
  });

export const saveExam = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        exam_name: z.string().min(1),
        exam_date: z.string().nullable().optional(),
        class_name: z.string().nullable().optional(),
        subject: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        is_published: z.boolean(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    if (data.id) {
      await sql`
        UPDATE exams SET exam_name = ${data.exam_name}, exam_date = ${data.exam_date ?? null},
          class_name = ${data.class_name ?? null}, subject = ${data.subject ?? null},
          description = ${data.description ?? null}, is_published = ${data.is_published}, updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } else {
      await sql`
        INSERT INTO exams (exam_name, exam_date, class_name, subject, description, is_published)
        VALUES (${data.exam_name}, ${data.exam_date ?? null}, ${data.class_name ?? null},
                ${data.subject ?? null}, ${data.description ?? null}, ${data.is_published})
      `;
    }
    return { ok: true };
  });

export const toggleExamPublish = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), is_published: z.boolean() }).parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`UPDATE exams SET is_published = ${data.is_published} WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM results WHERE exam_id = ${data.id}::uuid`;
    await sql`DELETE FROM exams WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const listResults = createServerFn({ method: "GET" })
  .middleware(auth)
  .inputValidator((input) => z.object({ examId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    return sql`
      SELECT * FROM results WHERE exam_id = ${data.examId}::uuid
      ORDER BY rank ASC NULLS LAST, marks DESC
    `;
  });

export const recalculateRanks = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ examId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      WITH ranked AS (
        SELECT id, RANK() OVER (ORDER BY marks DESC) AS r
        FROM results WHERE exam_id = ${data.examId}::uuid
      )
      UPDATE results r SET rank = ranked.r::int FROM ranked WHERE r.id = ranked.id
    `;
    return { ok: true };
  });

export const insertResult = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        exam_id: z.string().uuid(),
        student_name: z.string().min(1),
        index_number: z.string().min(1),
        school: z.string().nullable().optional(),
        marks: z.number(),
        grade: z.string().nullable().optional(),
        teacher_comment: z.string().nullable().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      INSERT INTO results (exam_id, student_name, index_number, school, marks, grade, teacher_comment)
      VALUES (${data.exam_id}::uuid, ${data.student_name}, ${data.index_number}, ${data.school ?? null},
              ${data.marks}, ${data.grade ?? null}, ${data.teacher_comment ?? null})
    `;
    return { ok: true };
  });

export const insertResultsBulk = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        exam_id: z.string().uuid(),
        rows: z.array(
          z.object({
            student_name: z.string(),
            index_number: z.string(),
            school: z.string().nullable().optional(),
            marks: z.number(),
            grade: z.string().nullable().optional(),
            teacher_comment: z.string().nullable().optional(),
          })
        ),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    for (const row of data.rows) {
      await sql`
        INSERT INTO results (exam_id, student_name, index_number, school, marks, grade, teacher_comment)
        VALUES (${data.exam_id}::uuid, ${row.student_name}, ${row.index_number}, ${row.school ?? null},
                ${row.marks}, ${row.grade ?? null}, ${row.teacher_comment ?? null})
      `;
    }
    return { ok: true };
  });

export const deleteResult = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM results WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.record(z.any()).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    const [existing] = await sql`SELECT id FROM site_settings LIMIT 1`;
    if (!existing) {
      await sql`INSERT INTO site_settings DEFAULT VALUES`;
    }
    const [row] = await sql`SELECT id FROM site_settings LIMIT 1`;
    const id = row.id;
    await sql`
      UPDATE site_settings SET
        website_name = ${data.website_name ?? "GEN_ZCIENCE"},
        tagline = ${data.tagline ?? null},
        hero_title = ${data.hero_title ?? null},
        hero_description = ${data.hero_description ?? null},
        teacher_name = ${data.teacher_name ?? null},
        teacher_short_name = ${data.teacher_short_name ?? null},
        teacher_bio = ${data.teacher_bio ?? null},
        teacher_slogan = ${data.teacher_slogan ?? null},
        teacher_photo_url = ${data.teacher_photo_url ?? null},
        class_description = ${data.class_description ?? null},
        logo_url = ${data.logo_url ?? null},
        banner_url = ${data.banner_url ?? null},
        footer_text = ${data.footer_text ?? null},
        updated_at = now()
      WHERE id = ${id}::uuid
    `;
    return { ok: true };
  });

export const saveContactSettings = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.record(z.any()).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    const [row] = await sql`SELECT id FROM contact_settings LIMIT 1`;
    if (!row) await sql`INSERT INTO contact_settings DEFAULT VALUES`;
    const [idRow] = await sql`SELECT id FROM contact_settings LIMIT 1`;
    await sql`
      UPDATE contact_settings SET
        phone_number = ${data.phone_number ?? null},
        whatsapp_number_1 = ${data.whatsapp_number_1 ?? null},
        whatsapp_number_2 = ${data.whatsapp_number_2 ?? null},
        email = ${data.email ?? null},
        address = ${data.address ?? null},
        google_map_embed_url = ${data.google_map_embed_url ?? null},
        updated_at = now()
      WHERE id = ${idRow.id}::uuid
    `;
    return { ok: true };
  });

export const listSocialLinksAdmin = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async () => {
    const sql = getSql();
    return sql`SELECT * FROM social_links ORDER BY sort_order`;
  });

export const insertSocialLink = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z.object({ platform: z.string(), url: z.string().url() }).parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`
      INSERT INTO social_links (platform, url, is_active) VALUES (${data.platform}, ${data.url}, true)
    `;
    return { ok: true };
  });

export const deleteSocialLink = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    await sql`DELETE FROM social_links WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });

export const uploadFile = createServerFn({ method: "POST" })
  .middleware(auth)
  .inputValidator((input) =>
    z
      .object({
        folder: z.enum([
          "logos",
          "banners",
          "teacher-photos",
          "notes",
          "notice-attachments",
          "gallery",
        ]),
        filename: z.string(),
        base64: z.string(),
        contentType: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const buffer = Buffer.from(data.base64, "base64");
    const url = await uploadPublicFile(data.folder as StorageFolder, data.filename, buffer);
    return { url };
  });
