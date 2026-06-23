-- Online Classes module (run after schema.sql)

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE 'student';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_auth_users(id) ON DELETE CASCADE,
  display_name TEXT,
  index_number TEXT,
  school TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  teacher_name TEXT,
  lesson_name TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  storage_provider TEXT NOT NULL DEFAULT 'youtube',
  storage_key TEXT,
  video_url TEXT,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  file_size_bytes BIGINT,
  recorded_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  legacy_youtube_lesson_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES app_auth_users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_auth_users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES app_auth_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  duration_days INT NOT NULL DEFAULT 30,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES app_auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activation_key_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES activation_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_playback (
  user_id UUID NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES class_videos(id) ON DELETE CASCADE,
  position_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_class_videos_published ON class_videos(is_published, recorded_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_class_videos_subject ON class_videos(subject);
CREATE INDEX IF NOT EXISTS idx_class_videos_category ON class_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_student_access_user ON student_access(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_access_active ON student_access(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_playback_user ON video_playback(user_id);

-- Migrate legacy YouTube lessons into class_videos (idempotent)
INSERT INTO class_videos (
  title, description, youtube_video_id, video_url, storage_provider,
  category_id, is_published, sort_order, legacy_youtube_lesson_id, recorded_at, thumbnail_url
)
SELECT
  y.title,
  y.description,
  y.youtube_video_id,
  y.youtube_url,
  'youtube',
  y.category_id,
  true,
  0,
  y.id,
  y.created_at,
  CASE
    WHEN y.youtube_video_id IS NOT NULL AND y.youtube_video_id <> ''
    THEN 'https://img.youtube.com/vi/' || y.youtube_video_id || '/hqdefault.jpg'
    ELSE NULL
  END
FROM youtube_lessons y
WHERE NOT EXISTS (
  SELECT 1 FROM class_videos cv WHERE cv.legacy_youtube_lesson_id = y.id
);
