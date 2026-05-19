import { useRouteContext } from "@tanstack/react-router";
import type { Session } from "@auth/core/types";

type AuthSession = Session & {
  user: {
    id: string;
    name: string;
    roles: Array<"admin" | "super_admin">;
  };
};

export function useAuth() {
  const { session, sessionLoading } = useRouteContext({ from: "__root__" }) as {
    session: AuthSession | null;
    sessionLoading: boolean;
  };

  const roles = session?.user?.roles ?? [];
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  return {
    session,
    user: session?.user ?? null,
    roles,
    isAdmin,
    isSuperAdmin,
    username: session?.user?.name ?? "",
    loading: sessionLoading,
  };
}
