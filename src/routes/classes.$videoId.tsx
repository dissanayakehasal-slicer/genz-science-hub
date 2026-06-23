import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { getClassVideoStudent, savePlaybackProgress } from "@/lib/api/classes.student.functions";
import { formatDate } from "@/lib/date";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/classes/$videoId")({
  component: ClassVideoPage,
});

function ClassVideoPage() {
  const { videoId } = Route.useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [saved, setSaved] = useState(false);

  const getFn = useServerFn(getClassVideoStudent);
  const saveFn = useServerFn(savePlaybackProgress);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["class-video", videoId],
    queryFn: () => getFn({ data: { videoId } }),
  });

  useEffect(() => {
    if (!data || data.locked || data.storage_provider === "youtube") return;
    const el = videoRef.current;
    if (!el || !data.playback_position) return;
    const pos = Number(data.playback_position);
    if (pos > 5) {
      el.currentTime = pos;
    }
  }, [data]);

  const persistProgress = async () => {
    const el = videoRef.current;
    if (!el || data?.locked || saved) return;
    try {
      await saveFn({ data: { videoId, positionSeconds: Math.floor(el.currentTime) } });
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--gold)]" size={36} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-red-600">{(error as Error)?.message ?? "Video not found"}</p>
        <Link to="/classes" className="mt-4 inline-block text-[var(--gold)] font-semibold">
          ← Back to classes
        </Link>
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-8">
      <Link to="/classes" className="inline-flex items-center gap-1 text-sm text-[var(--brown)]/70 hover:text-[var(--gold)] mb-4">
        <ArrowLeft size={16} /> All classes
      </Link>

      {data.locked ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center">
          <Lock className="mx-auto text-amber-600 mb-4" size={48} />
          <h2 className="font-display font-bold text-xl mb-2">Access required</h2>
          <p className="text-[var(--brown)]/80 mb-4">Your monthly access has expired. Renew to watch this recording.</p>
          {data.access?.expires_at && (
            <p className="text-sm text-[var(--brown)]/60">Last expired: {formatDate(data.access.expires_at)}</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-6 shadow-elegant">
          {data.storage_provider === "youtube" && data.stream_url ? (
            <iframe
              src={data.stream_url}
              title={data.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : data.stream_url ? (
            <video
              ref={videoRef}
              src={data.stream_url}
              controls
              className="w-full h-full"
              onPause={persistProgress}
              onEnded={persistProgress}
              playsInline
            />
          ) : (
            <div className="grid place-items-center h-full text-white/70">Video unavailable</div>
          )}
        </div>
      )}

      <h1 className="text-3xl font-display font-bold">{data.title}</h1>
      <div className="flex flex-wrap gap-3 text-sm text-[var(--brown)]/70 mt-2">
        {data.subject && <span>{data.subject}</span>}
        {data.teacher_name && <span>· {data.teacher_name}</span>}
        {data.recorded_at && <span>· {formatDate(data.recorded_at)}</span>}
      </div>
      {data.description && <p className="mt-4 text-[var(--brown)] leading-relaxed">{data.description}</p>}
    </section>
  );
}
