import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { serializeExamRow } from "@/lib/date";

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  const rows = await sql`SELECT * FROM site_settings LIMIT 1`;
  return rows[0] ?? null;
});

export const getContactSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  const rows = await sql`SELECT * FROM contact_settings LIMIT 1`;
  return rows[0] ?? null;
});

export const getSocialLinks = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`SELECT * FROM social_links WHERE is_active = true ORDER BY sort_order`;
});

export const getCategories = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ type: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    return sql`SELECT * FROM categories WHERE type = ${data.type} ORDER BY sort_order`;
  });

export const getNotices = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`
    SELECT n.*, c.name AS category_name, c.color AS category_color
    FROM notices n
    LEFT JOIN categories c ON c.id = n.category_id
    WHERE n.publish_date <= now()
    ORDER BY n.publish_date DESC
  `;
});

export const getNotes = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`
    SELECT n.*, c.name AS category_name, c.color AS category_color
    FROM notes n
    LEFT JOIN categories c ON c.id = n.category_id
    ORDER BY n.created_at DESC
  `;
});

export const getGallery = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`
    SELECT g.*, c.name AS category_name
    FROM gallery_images g
    LEFT JOIN categories c ON c.id = g.category_id
    ORDER BY g.created_at DESC
  `;
});

export const getYoutubePlaylists = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`SELECT * FROM youtube_playlists ORDER BY sort_order`;
});

export const getYoutubeLessons = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  return sql`
    SELECT l.*, p.title AS playlist_title
    FROM youtube_lessons l
    LEFT JOIN youtube_playlists p ON p.id = l.playlist_id
    ORDER BY l.created_at DESC
  `;
});

export const getPublishedExams = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  const rows = await sql`SELECT * FROM exams WHERE is_published = true ORDER BY exam_date DESC NULLS LAST`;
  return (rows as Record<string, unknown>[]).map(serializeExamRow);
});

export const getTop10 = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ examId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sql = getSql();
    return sql`
      SELECT r."rank", r.student_name, r.school, r.marks, r.grade
      FROM results r
      JOIN exams e ON e.id = r.exam_id
      WHERE r.exam_id = ${data.examId}::uuid AND e.is_published = true
      ORDER BY r."rank" ASC NULLS LAST, r.marks DESC
      LIMIT 10
    `;
  });

export const lookupResult = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ examId: z.string().uuid(), indexNumber: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data }) => {
    const sql = getSql();
    const rows = await sql`
      SELECT r.student_name, r.school, r.index_number, e.exam_name, e.subject,
             r.marks, r.grade, r."rank", r.teacher_comment
      FROM results r
      JOIN exams e ON e.id = r.exam_id
      WHERE r.exam_id = ${data.examId}::uuid
        AND e.is_published = true
        AND lower(trim(r.index_number)) = lower(trim(${data.indexNumber}))
      LIMIT 1
    `;
    return rows[0] ?? null;
  });

export const getHomeHighlights = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getSql();
  const [notice] = await sql`
    SELECT title, publish_date FROM notices
    WHERE publish_date <= now() ORDER BY publish_date DESC LIMIT 1
  `;
  const [exam] = await sql`
    SELECT exam_name, exam_date FROM exams
    WHERE is_published = true ORDER BY exam_date DESC NULLS LAST LIMIT 1
  `;
  const [lesson] = await sql`
    SELECT title FROM youtube_lessons WHERE is_featured = true LIMIT 1
  `;
  return { notice: notice ?? null, exam: exam ?? null, lesson: lesson ?? null };
});
