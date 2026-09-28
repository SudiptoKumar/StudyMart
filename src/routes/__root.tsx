import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { RouteLoader } from "@/components/route-loader";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl">
        🔍
      </div>
      <h1 className="mt-6 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        We couldn't find what you were looking for.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        Back to home
      </Link>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#ffffff" },
      { title: "StudyMart | Digital products for Student" },
      {
        name: "description",
        content: "Shop notes, PDFs, prompts and courses. Instant access after purchase.",
      },
      { property: "og:title", content: "StudyMart | Digital products for Student" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "StudyMart | Digital products for Student" },
      { name: "description", content: "StudyMart is an online store for students to access digital study materials." },
      { property: "og:description", content: "StudyMart is an online store for students to access digital study materials." },
      { name: "twitter:description", content: "StudyMart is an online store for students to access digital study materials." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/AT6UkfYYkgOSivvTLLRxhlIWn4I3/social-images/social-1776783289085-file_00000000451871fa83d4d4ddcba50805.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/AT6UkfYYkgOSivvTLLRxhlIWn4I3/social-images/social-1776783289085-file_00000000451871fa83d4d4ddcba50805.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <AuthProvider>
        <CartProvider>
          <RouteLoader />
          <Outlet />
          <Toaster />
        </CartProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <RouteLoader />
        <div className="mx-auto flex min-h-screen max-w-md flex-col grid-bg app-shell">
          <main className="flex-1">
            <Outlet />
          </main>
          <BottomNav />
          <Toaster />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
