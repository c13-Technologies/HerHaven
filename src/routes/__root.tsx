import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTheme } from "../hooks/use-theme";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav, MobileFab } from "@/components/bottom-nav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-serif text-5xl text-foreground">This page is quiet.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or has moved on.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl text-foreground">Something didn’t open right.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Take a breath and try again. We’re sorry for the bump.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Her Haven — A safe space for women to share, heal and grow" },
      {
        name: "description",
        content:
          "Her Haven is a warm, supportive community where women share stories about relationships, career, motherhood, mental wellness, faith and personal growth.",
      },
      { name: "author", content: "Her Haven" },
      { property: "og:title", content: "Her Haven — A safe space for women to share, heal and grow" },
      {
        property: "og:description",
        content:
          "A safe, supportive digital community for women — share, find advice and grow together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Her Haven — A safe space for women to share, heal and grow" },
      { name: "description", content: "Her Sanctuary Space is a secure, mobile-friendly web app for women to share experiences and find support." },
      { property: "og:description", content: "Her Sanctuary Space is a secure, mobile-friendly web app for women to share experiences and find support." },
      { name: "twitter:description", content: "Her Sanctuary Space is a secure, mobile-friendly web app for women to share experiences and find support." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/38f0d019-5417-44ee-8061-09fc12ee05b6/id-preview-3093de1f--02110432-1d73-4aac-87c7-8c83e23ca2f4.lovable.app-1782365642283.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/38f0d019-5417-44ee-8061-09fc12ee05b6/id-preview-3093de1f--02110432-1d73-4aac-87c7-8c83e23ca2f4.lovable.app-1782365642283.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t=localStorage.getItem('her-haven-theme');
                  if(!t){
                    t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
                  }
                  if(t==='dark') document.documentElement.classList.add('dark');
                }catch(e){}
              })();
            `,
          }}
        />
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
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-dvh flex-col bg-background pb-16 sm:pb-0">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
        <BottomNav />
        <MobileFab />
      </div>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
