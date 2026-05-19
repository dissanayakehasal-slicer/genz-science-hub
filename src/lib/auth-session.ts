import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "start-authjs";
import { authConfig } from "@/utils/auth";

export const fetchAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  if (!request) return null;
  if (!authConfig.secret && !process.env.AUTH_SECRET) {
    console.warn("[auth] AUTH_SECRET is not set; treating as signed out");
    return null;
  }
  try {
    return await getSession(request, authConfig);
  } catch (error) {
    console.error("[auth] getSession failed:", error);
    return null;
  }
});
