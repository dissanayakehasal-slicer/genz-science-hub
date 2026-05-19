import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcryptjs";
import type { StartAuthJSConfig } from "start-authjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AppRole = "admin" | "super_admin";

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
