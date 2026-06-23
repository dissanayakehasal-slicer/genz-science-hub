import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "start-authjs";
import { authConfig, type AppRole } from "@/utils/auth";

async function getAuthContext() {
  const request = getRequest();
  if (!request) throw new Error("Unauthorized: No request");
  const session = await getSession(request, authConfig);
  if (!session?.user?.id) throw new Error("Unauthorized: Sign in required");
  return {
    userId: session.user.id,
    username: session.user.name,
    roles: (session.user.roles ?? []) as AppRole[],
  };
}

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const ctx = await getAuthContext();
  if (!ctx.roles.includes("admin") && !ctx.roles.includes("super_admin")) {
    throw new Error("Forbidden: Admin access required");
  }
  return next({ context: ctx });
});

export const requireStudent = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const ctx = await getAuthContext();
  if (!ctx.roles.includes("student")) {
    throw new Error("Forbidden: Student access required");
  }
  return next({ context: ctx });
});

export const requireAdminOrStudent = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const ctx = await getAuthContext();
  const ok =
    ctx.roles.includes("student") ||
    ctx.roles.includes("admin") ||
    ctx.roles.includes("super_admin");
  if (!ok) throw new Error("Forbidden");
  return next({ context: ctx });
});
