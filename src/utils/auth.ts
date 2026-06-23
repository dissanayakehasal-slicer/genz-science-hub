import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcryptjs";
import type { StartAuthJSConfig } from "start-authjs";
import { getSql } from "@/lib/db";

export type AppRole = "admin" | "super_admin" | "student";

declare module "@auth/core/types" {
  interface User {
    roles?: AppRole[];
  }
  interface Session {
    user: {
      id: string;
      name: string;
      roles: AppRole[];
    };
  }
}

function authorizeFromEnv(username: string, password: string) {
  const envUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const envPass = process.env.ADMIN_PASSWORD;
  if (!envUser || !envPass) return null;
  if (username !== envUser || password !== envPass) return null;
  return {
    id: process.env.ADMIN_USER_ID ?? "a0000000-0000-4000-8000-000000000001",
    name: envUser,
    roles: ["super_admin"] as AppRole[],
  };
}

async function loadRoles(userId: string): Promise<AppRole[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT role FROM user_roles WHERE user_id = ${userId}::uuid
  `;
  return rows
    .map((r) => (r as { role: string }).role as AppRole)
    .filter((r) => r === "admin" || r === "super_admin" || r === "student");
}

async function authorizeFromDatabase(username: string, password: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, username, password_hash FROM app_auth_users
    WHERE username = ${username} LIMIT 1
  `;
  const user = rows[0] as { id: string; username: string; password_hash: string } | undefined;
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const roles = await loadRoles(user.id);
  if (!roles.length) return null;

  return { id: user.id, name: user.username, roles };
}

export const authConfig: StartAuthJSConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        if (!username || !password) return null;

        try {
          return (await authorizeFromDatabase(username, password)) ?? authorizeFromEnv(username, password);
        } catch (error) {
          console.error("[auth] database login failed, trying env fallback:", error);
          return authorizeFromEnv(username, password);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.roles = user.roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user = {
          id: token.sub,
          name: (token.name as string) ?? "",
          roles: (token.roles as AppRole[]) ?? [],
        };
      }
      return session;
    },
  },
};
