import { createMiddleware } from "@tanstack/react-start";

/** Auth.js uses HTTP-only cookies; server functions read the session from the request. */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  return next();
});
