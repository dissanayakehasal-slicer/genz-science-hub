import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/youtube")({ component: () => (
  <div><h1 className="text-3xl font-display font-bold mb-2">YouTube Management</h1><p className="text-[var(--brown)]/70 mb-8">Full editor coming in the next iteration.</p><div className="bg-white rounded-2xl p-8 shadow-card border border-[var(--border)]"><p className="text-sm">Ask me to build the YouTube admin editor for playlists + videos.</p></div></div>
)});
