import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getPhotographerContext } from "@/lib/auth/session";

import { BottomNav, SidebarNav } from "./dashboard-nav";

/**
 * Shell for every /dashboard page.
 * - Desktop (md and up, 768 px+): sidebar on the left, content on the right.
 * - Phone: compact top bar and a tab bar at the bottom; theme and language live in Settings.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // The proxy already redirects signed-out visitors; this is the second line of defence.
  const context = await getPhotographerContext();
  if (!context) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r px-3 py-5 md:flex">
        <Brand href="/dashboard" className="px-3" />
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-3 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
          <SignOutButton className="-mx-3" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/dashboard" className="md:hidden" />
            <span className="h-4 w-px shrink-0 bg-border md:hidden" aria-hidden />
            <span data-testid="workspace-name" className="truncate text-sm text-muted-foreground">
              {context.workspace.name}
            </span>
          </div>
          <SignOutButton compact className="md:hidden" />
        </header>

        {/* pb-24 keeps the last row of content clear of the phone tab bar. */}
        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>

      <BottomNav className="md:hidden" />
    </div>
  );
}
