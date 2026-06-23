import { createFileRoute } from "@tanstack/react-router";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl, getSql } from "@/lib/db";
import schemaSql from "../../../vercel/schema.sql?raw";
import onlineClassesSql from "../../../vercel/migrations/001_online_classes.sql?raw";

export const Route = createFileRoute("/api/setup-db")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = request.headers.get("authorization")?.replace("Bearer ", "");
          if (!secret || secret !== process.env.SETUP_SECRET) {
            return new Response("Forbidden", { status: 403 });
          }

          const url = getDatabaseUrl();
          if (!url) {
            return Response.json({ error: "No database URL" }, { status: 500 });
          }

          const pool = new Pool({ connectionString: url });
          try {
            await pool.query(schemaSql);
            await pool.query(onlineClassesSql);
          } finally {
            await pool.end();
          }

          const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Hasal@2011";
          const hash = await bcrypt.hash(password, 12);
          const username = "hasal";
          const sql = getSql();

          const existing = await sql`
            SELECT id FROM app_auth_users WHERE username = ${username} LIMIT 1
          `;
          let userId = (existing[0] as { id: string } | undefined)?.id;
          if (userId) {
            await sql`UPDATE app_auth_users SET password_hash = ${hash} WHERE id = ${userId}::uuid`;
          } else {
            const ins = await sql`
              INSERT INTO app_auth_users (username, password_hash) VALUES (${username}, ${hash})
              RETURNING id
            `;
            userId = (ins[0] as { id: string }).id;
          }
          await sql`DELETE FROM user_roles WHERE user_id = ${userId}::uuid`;
          await sql`
            INSERT INTO user_roles (user_id, role) VALUES (${userId}::uuid, 'super_admin'::app_role)
            ON CONFLICT DO NOTHING
          `;

          return Response.json({ ok: true, message: "Schema applied, online classes migrated, hasal admin ready" });
        } catch (error) {
          console.error("[setup-db]", error);
          const message = error instanceof Error ? error.message : "Setup failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
