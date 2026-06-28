import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { ensureDemoSeed } from "@/lib/local-demo/seed";
import i18n from "@/lib/i18n";

import appCss from "../styles.css?url";

if (typeof window !== "undefined") {
  ensureDemoSeed();
}

function NotFoundComponent() {
  const t = i18n.getFixedT(i18n.language);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-medium text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-medium text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            {t("notFound.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pathway Advisory — School Placement Guidance for Hong Kong Families" },
      {
        name: "description",
        content:
          "Pathway Advisory is an end-to-end advisory platform for Hong Kong secondary school placement.",
      },
      { name: "author", content: "Pathway Advisory" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        <PoweredByFooter />
      </div>
      <Toaster richColors closeButton />
    </AuthProvider>
  );
}
