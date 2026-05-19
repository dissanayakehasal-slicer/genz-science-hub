import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "start-authjs";
import { authConfig, type AppRole } from "@/utils/auth";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) throw new Error("Unauthorized: No request");

  const session = await getSession(request, authConfig);
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Sign in required");
  }

  const roles = session.user.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    throw new Error("Forbidden: Admin access required");
  }

  return next({
    context: {
      userId: session.user.id,
      username: session.user.name,
      roles: roles as AppRole[],
    },
  });
});
