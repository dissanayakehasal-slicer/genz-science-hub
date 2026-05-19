import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "start-authjs";
import { authConfig } from "@/utils/auth";

export const fetchAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  if (!request) return null;
  return getSession(request, authConfig);
});
