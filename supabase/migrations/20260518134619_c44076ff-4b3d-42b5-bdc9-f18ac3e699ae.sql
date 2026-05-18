
-- =========================================
-- Roles
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =========================================
-- Site settings (single row)
-- =========================================
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_name TEXT NOT NULL DEFAULT 'GEN_ZCIENCE',
  tagline TEXT DEFAULT 'Science, but make it Gen Z.',
  hero_title TEXT DEFAULT 'GEN_ZCIENCE',
  hero_description TEXT DEFAULT 'A modern science learning hub for the next generation.',
  teacher_name TEXT DEFAULT 'Geeth Munasingha',
  teacher_short_name TEXT DEFAULT 'GSM',
  teacher_bio TEXT DEFAULT 'Passionate science educator dedicated to making complex concepts simple, engaging, and unforgettable.',
  teacher_photo_url TEXT,
  class_description TEXT DEFAULT 'Premium science classes for curious minds.',
  logo_url TEXT,
  banner_url TEXT,
  footer_text TEXT DEFAULT '© GEN_ZCIENCE. All rights reserved.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admin manage site_settings" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Contact settings (single row)
-- =========================================
CREATE TABLE public.contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT,
  whatsapp_number_1 TEXT,
  whatsapp_number_2 TEXT,
  email TEXT,
  address TEXT,
  google_map_embed_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read contact_settings" ON public.contact_settings FOR SELECT USING (true);
CREATE POLICY "admin manage contact_settings" ON public.contact_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_contact_settings_updated BEFORE UPDATE ON public.contact_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Social links
-- =========================================
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read social_links" ON public.social_links FOR SELECT USING (is_active = true);
CREATE POLICY "admin manage social_links" ON public.social_links FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_social_links_updated BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Categories
-- =========================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- notice | note | youtube | gallery | exam
  color TEXT DEFAULT '#D4A017',
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Notices
-- =========================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  attachment_url TEXT,
  is_important BOOLEAN NOT NULL DEFAULT false,
  publish_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read notices" ON public.notices FOR SELECT USING (publish_date <= now());
CREATE POLICY "admin manage notices" ON public.notices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_notices_updated BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Notes
-- =========================================
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  file_url TEXT,
  external_link TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "admin manage notes" ON public.notes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- YouTube playlists & lessons
-- =========================================
CREATE TABLE public.youtube_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.youtube_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read playlists" ON public.youtube_playlists FOR SELECT USING (true);
CREATE POLICY "admin manage playlists" ON public.youtube_playlists FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_playlists_updated BEFORE UPDATE ON public.youtube_playlists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.youtube_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT,
  playlist_id UUID REFERENCES public.youtube_playlists(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.youtube_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read lessons" ON public.youtube_lessons FOR SELECT USING (true);
CREATE POLICY "admin manage lessons" ON public.youtube_lessons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.youtube_lessons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Gallery
-- =========================================
CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  caption TEXT,
  image_url TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read gallery" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "admin manage gallery" ON public.gallery_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- Exams & Results
-- =========================================
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name TEXT NOT NULL,
  exam_date DATE,
  class_name TEXT,
  subject TEXT,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published exams" ON public.exams FOR SELECT USING (is_published = true);
CREATE POLICY "admin manage exams" ON public.exams FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  index_number TEXT NOT NULL,
  marks NUMERIC NOT NULL DEFAULT 0,
  grade TEXT,
  rank INT,
  teacher_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_results_exam ON public.results(exam_id);
CREATE INDEX idx_results_index ON public.results(index_number);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
-- Public read is intentionally NOT enabled. Results are exposed via security-definer RPCs below.
CREATE POLICY "admin manage results" ON public.results FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Recalculate ranks for an exam (called by admin after upload)
CREATE OR REPLACE FUNCTION public.recalculate_ranks(_exam_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH ranked AS (
    SELECT id, RANK() OVER (ORDER BY marks DESC) AS r
    FROM public.results WHERE exam_id = _exam_id
  )
  UPDATE public.results r SET rank = ranked.r FROM ranked WHERE r.id = ranked.id;
END $$;

-- Public top 10 (only for published exams)
CREATE OR REPLACE FUNCTION public.get_top10(_exam_id UUID)
RETURNS TABLE(rank INT, student_name TEXT, marks NUMERIC, grade TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.rank, r.student_name, r.marks, r.grade
  FROM public.results r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.exam_id = _exam_id AND e.is_published = true
  ORDER BY r.rank ASC NULLS LAST, r.marks DESC
  LIMIT 10;
$$;

-- Private lookup by index number (only for published exams)
CREATE OR REPLACE FUNCTION public.lookup_result(_exam_id UUID, _index_number TEXT)
RETURNS TABLE(
  student_name TEXT, index_number TEXT, exam_name TEXT, subject TEXT,
  marks NUMERIC, grade TEXT, rank INT, teacher_comment TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.student_name, r.index_number, e.exam_name, e.subject,
         r.marks, r.grade, r.rank, r.teacher_comment
  FROM public.results r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.exam_id = _exam_id
    AND e.is_published = true
    AND lower(trim(r.index_number)) = lower(trim(_index_number))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_top10(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_result(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_ranks(UUID) TO authenticated;

-- =========================================
-- Activity log
-- =========================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- =========================================
-- Storage buckets
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('logos','logos',true),
  ('banners','banners',true),
  ('teacher-photos','teacher-photos',true),
  ('notes','notes',true),
  ('notice-attachments','notice-attachments',true),
  ('gallery','gallery',true),
  ('result-uploads','result-uploads',false)
ON CONFLICT (id) DO NOTHING;

-- Public read for public buckets
CREATE POLICY "public read public buckets" ON storage.objects FOR SELECT
USING (bucket_id IN ('logos','banners','teacher-photos','notes','notice-attachments','gallery'));

-- Admins can manage all buckets
CREATE POLICY "admins manage storage" ON storage.objects FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
