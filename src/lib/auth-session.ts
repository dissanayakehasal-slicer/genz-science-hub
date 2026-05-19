import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "start-authjs";
import { SignJWT } from "jose";
import { authConfig } from "@/utils/auth";

export const fetchAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  if (!request) return null;
  return getSession(request, authConfig);
});

/** Mint a Supabase-compatible access token so existing RLS policies keep working. */
export const mintSupabaseAccessToken = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  if (!request) return null;

  const session = await getSession(request, authConfig);
  if (!session?.user?.id) return null;

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[auth] SUPABASE_JWT_SECRET is not set — cannot bridge Supabase session");
    return null;
  }

  const key = new TextEncoder().encode(secret);
  const access_token = await new SignJWT({
    role: "authenticated",
    aud: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  return { access_token, userId: session.user.id };
});
