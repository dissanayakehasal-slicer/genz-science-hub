import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { ParticlesBackground } from "@/components/ParticlesBackground";
import { useSiteSettings } from "@/hooks/useSiteData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, BookOpen, Bell, Trophy, Youtube, Image as ImageIcon, Phone } from "lucide-react";
import teacherFallback from "@/assets/teacher-placeholder.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [{ title: "GEN_ZCIENCE — Science, but make it Gen Z." }] }),
});

const quickLinks = [
  { to: "/notices", label: "Notices", Icon: Bell },
  { to: "/results", label: "Results", Icon: Trophy },
  { to: "/notes", label: "Notes", Icon: BookOpen },
  { to: "/youtube", label: "Lessons", Icon: Youtube },
  { to: "/gallery", label: "Gallery", Icon: ImageIcon },
  { to: "/contact", label: "Contact", Icon: Phone },
] as const;

function HomePage() {
  const { data: settings } = useSiteSettings();
  const { data: latestNotice } = useQuery({
    queryKey: ["latest-notice"],
    queryFn: async () => (await supabase.from("notices").select("title,publish_date").order("publish_date", { ascending: false }).limit(1).maybeSingle()).data,
    staleTime: 5 * 60 * 1000,
  });
  const { data: latestExam } = useQuery({
    queryKey: ["latest-exam"],
    queryFn: async () => (await supabase.from("exams").select("exam_name,exam_date").eq("is_published", true).order("exam_date", { ascending: false }).limit(1).maybeSingle()).data,
    staleTime: 5 * 60 * 1000,
  });
  const { data: featuredLesson } = useQuery({
    queryKey: ["featured-lesson"],
    queryFn: async () => (await supabase.from("youtube_lessons").select("title").eq("is_featured", true).limit(1).maybeSingle()).data,
    staleTime: 5 * 60 * 1000,
  });

  const teacherPhoto = settings?.teacher_photo_url ?? teacherFallback;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <ParticlesBackground />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block mb-6 px-4 py-1.5 rounded-full bg-[var(--gold-soft)]/50 border border-[var(--gold)]/30 text-xs uppercase tracking-[0.2em] font-semibold text-[var(--brown)]">
            With {settings?.teacher_name ?? "Geeth Munasingha"} — {settings?.teacher_short_name ?? "GMS"}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">
            <span className="text-gradient-gold">{settings?.hero_title ?? "GEN_ZCIENCE"}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6 text-lg md:text-xl text-[var(--brown)] max-w-2xl mx-auto">
            {settings?.tagline ?? "Science, but make it Gen Z."}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-3 text-sm text-[var(--brown)]/70 max-w-xl mx-auto">
            {settings?.hero_description}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/youtube" className="inline-flex items-center gap-2 bg-gradient-gold text-[var(--brown-deep)] font-semibold px-6 py-3 rounded-xl shadow-gold hover:scale-105 transition-transform">
              Start Learning <ArrowRight size={18} />
            </Link>
            <Link to="/results" className="inline-flex items-center gap-2 bg-[var(--brown-deep)] text-[var(--cream)] font-semibold px-6 py-3 rounded-xl hover:bg-[var(--brown)] transition-colors">
              Check Results
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map((q, i) => (
            <motion.div key={q.to} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link to={q.to} className="group block bg-white rounded-2xl p-5 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all text-center">
                <q.Icon className="mx-auto mb-2 text-[var(--gold)] group-hover:scale-110 transition-transform" size={26} />
                <div className="text-sm font-semibold">{q.label}</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Teacher Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
          <div className="absolute -inset-4 bg-gradient-gold rounded-3xl blur-2xl opacity-40" />
          <motion.img
            whileHover={{ scale: 1.02 }}
            src={teacherPhoto}
            alt={settings?.teacher_name ?? "Teacher"}
            width={768} height={896}
            className="relative rounded-3xl shadow-elegant border-4 border-[var(--gold)] aspect-[4/5] object-cover w-full"
          />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[var(--brown-deep)] text-[var(--gold-soft)] text-xs uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-gold">
            Your Science Mentor
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="text-xs uppercase tracking-[0.25em] font-semibold text-[var(--gold)] mb-3">Meet your teacher</div>
          <h2 className="text-4xl font-display font-bold mb-2">{settings?.teacher_name ?? "Geeth Munasingha"}</h2>
          <div className="text-[var(--brown)] font-mono mb-6">/ {settings?.teacher_short_name ?? "GMS"}</div>
          <p className="text-[var(--brown)] text-lg leading-relaxed">{settings?.teacher_bio}</p>
          <p className="mt-4 text-[var(--brown)]/80">{settings?.class_description}</p>
        </motion.div>
      </section>

      {/* Latest content cards */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-12 grid md:grid-cols-3 gap-6">
        {[
          { title: "Latest Notice", subtitle: latestNotice?.title ?? "No notices yet", to: "/notices", Icon: Bell },
          { title: "Latest Exam", subtitle: latestExam?.exam_name ?? "No exams yet", to: "/results", Icon: Trophy },
          { title: "Featured Lesson", subtitle: featuredLesson?.title ?? "Coming soon", to: "/youtube", Icon: Youtube },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <Link to={c.to} className="block bg-white rounded-2xl p-6 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all">
              <c.Icon className="text-[var(--gold)] mb-3" size={28} />
              <div className="text-xs uppercase tracking-widest text-[var(--brown)]/60 mb-1">{c.title}</div>
              <div className="font-semibold text-lg">{c.subtitle}</div>
            </Link>
          </motion.div>
        ))}
      </section>
    </PublicLayout>
  );
}
