import { neon } from "@neondatabase/serverless";

export function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_UNPOOLED
  );
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "No database URL. Connect Vercel Postgres/Neon and set POSTGRES_URL or DATABASE_URL."
    );
  }
  return neon(url);
}

export type Sql = ReturnType<typeof getSql>;
