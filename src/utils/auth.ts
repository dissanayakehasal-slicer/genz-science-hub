import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcryptjs";
import type { StartAuthJSConfig } from "start-authjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AppRole = "admin" | "super_admin";

/** Stable ID for env-only admin (must match a row in user_roles if using Supabase data). */
const ENV_ADMIN_USER_ID =
  process.env.ADMIN_USER_ID ?? "a0000000-0000-4000-8000-000000000001";

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
    id: ENV_ADMIN_USER_ID,
    name: envUser,
    roles: ["super_admin"] as AppRole[],
  };
}

async function loadRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.role as AppRole)
    .filter((r) => r === "admin" || r === "super_admin");
}

async function authorizeFromDatabase(username: string, password: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const { data: user, error } = await supabaseAdmin
    .from("app_auth_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const roles = await loadRoles(user.id);
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    return null;
  }

  return {
    id: user.id,
    name: user.username,
    roles,
  };
}

export const authConfig: StartAuthJSConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
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

        // Works without Supabase dashboard (set on Vercel only).
        const envUser = authorizeFromEnv(username, password);
        if (envUser) return envUser;

        return authorizeFromDatabase(username, password);
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
