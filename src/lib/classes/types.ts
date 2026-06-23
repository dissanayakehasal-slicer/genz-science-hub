export type VideoStorageProvider = "youtube" | "blob" | "r2";

export type ClassVideo = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  teacher_name: string | null;
  lesson_name: string | null;
  category_id: string | null;
  category_name?: string | null;
  storage_provider: VideoStorageProvider;
  storage_key: string | null;
  video_url: string | null;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  recorded_at: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  locked?: boolean;
  playback_position?: number;
};

export type StudentAccessInfo = {
  active: boolean;
  expires_at: string | null;
  days_remaining: number | null;
};

export type ClassesDashboardStats = {
  total_videos: number;
  published_videos: number;
  active_students: number;
  expired_students: number;
  recent_uploads: number;
  broken_videos: number;
};
