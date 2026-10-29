import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { getPhotographerContext } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // The proxy already redirects signed-out visitors; this is the second line of defence.
  const context = await getPhotographerContext();
  if (!context) redirect("/login?next=/dashboard");

  const t = await getTranslations("Dashboard");

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Brand href="/dashboard" />
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span data-testid="workspace-name" className="truncate text-sm text-muted-foreground">
            {context.workspace.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm" aria-label={t("signOut")}>
              <LogOut aria-hidden />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}
