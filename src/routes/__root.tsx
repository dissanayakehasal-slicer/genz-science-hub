import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { Session } from "@auth/core/types";
import { Toaster } from "@/components/ui/sonner";
import { fetchAuthSession } from "@/lib/auth-session";

import appCss from "../styles.css?url";

export type RootRouterContext = {
  queryClient: QueryClient;
  session: (Session & { user: { id: string; name: string; roles: string[] } }) | null;
  sessionLoading: boolean;
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-lg bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-[var(--brown-deep)] shadow-gold">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-lg bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-[var(--brown-deep)]">
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RootRouterContext>()({
  beforeLoad: async () => {
    const session = await fetchAuthSession();
    return { session, sessionLoading: false };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GEN_ZCIENCE" },
      { name: "description", content: "Premium science classes by Geeth Munasingha (GMS). Notes, lessons, results, and more." },
      { property: "og:title", content: "GEN_ZCIENCE" },
      { name: "twitter:title", content: "GEN_ZCIENCE" },
      { property: "og:description", content: "Premium science classes by Geeth Munasingha (GMS). Notes, lessons, results, and more." },
      { name: "twitter:description", content: "Premium science classes by Geeth Munasingha (GMS). Notes, lessons, results, and more." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/uzuQU8AxXcTdRxG7BbFP8aLCmkB3/social-images/social-1779114918070-WhatsApp_Image_2026-05-18_at_7.34.54_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/uzuQU8AxXcTdRxG7BbFP8aLCmkB3/social-images/social-1779114918070-WhatsApp_Image_2026-05-18_at_7.34.54_PM.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
