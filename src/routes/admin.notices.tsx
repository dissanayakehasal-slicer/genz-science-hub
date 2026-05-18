import { createFileRoute } from "@tanstack/react-router";

function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-2">{title}</h1>
      <p className="text-[var(--brown)]/70 mb-8">Full editor coming in the next iteration.</p>
      <div className="bg-white rounded-2xl p-8 shadow-card border border-[var(--border)]">
        <p className="text-sm text-[var(--brown)]/80">
          Ask me to <strong>"build the {title.toLowerCase()} admin editor"</strong> and I'll add full create / edit / delete with upload support.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/notices")({ component: () => <ComingSoon title="Notices Management" /> });
