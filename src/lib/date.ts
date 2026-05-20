/** Format a DB date/timestamp for display (never pass raw Date into JSX). */
export function formatDate(value: string | Date | null | undefined, fallback = ""): string {
  if (value == null || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString();
}

/** Format for <input type="date" /> (YYYY-MM-DD). */
export function formatDateInput(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Normalize exam rows from Postgres so clients never receive raw Date objects. */
export function serializeExamRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    exam_date: row.exam_date != null ? formatDateInput(row.exam_date as string | Date) : null,
  };
}
