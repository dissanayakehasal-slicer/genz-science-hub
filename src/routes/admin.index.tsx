import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/api/admin.functions";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Bell, FileText, Image, Youtube, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const statsFn = useServerFn(getAdminStats);
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
  });

  const cards = [
    { label: "Notices", value: stats?.notices ?? 0, Icon: Bell },
    { label: "Notes", value: stats?.notes ?? 0, Icon: FileText },
    { label: "Gallery", value: stats?.gallery ?? 0, Icon: Image },
    { label: "YouTube Lessons", value: stats?.lessons ?? 0, Icon: Youtube },
    { label: "Exams", value: stats?.exams ?? 0, Icon: Trophy },
    { label: "Total Results", value: stats?.results ?? 0, Icon: Users },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">Welcome back 👋</h1>
      <p className="text-[var(--brown)]/70 mb-8">Here's what's happening on your platform.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-card border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-gold grid place-items-center"><c.Icon className="text-[var(--brown-deep)]" size={20}/></div>
              <CountUp value={c.value} />
            </div>
            <div className="text-sm text-[var(--brown)]/70 font-medium">{c.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 bg-white rounded-2xl p-6 shadow-card border border-[var(--border)]">
        <h3 className="font-display font-semibold text-lg mb-2">Getting started</h3>
        <ul className="text-sm text-[var(--brown)]/80 space-y-2 list-disc pl-5">
          <li>Open <strong>Site Settings</strong> to update the teacher name, photo, and hero text.</li>
          <li>Manage content via the sidebar — Notices, Notes, YouTube, Gallery, Results.</li>
          <li>Use <strong>Categories</strong> to add or rename filters for each section.</li>
          <li>Configure contact info and social links in <strong>Contact & Social</strong>.</li>
        </ul>
      </div>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => { const c = animate(mv, value, { duration: 1.2 }); return c.stop; }, [value]);
  return <motion.div className="font-display font-bold text-3xl text-[var(--brown-deep)]">{rounded}</motion.div>;
}
