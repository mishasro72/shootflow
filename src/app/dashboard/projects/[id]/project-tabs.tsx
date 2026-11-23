"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Tabs of a project: Overview and Board (later Shoot and Selection). Plain links, so each
 * tab has its own address and the browser's Back button works; the current one is marked
 * with aria-current for screen readers.
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const t = useTranslations("Project");
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;
  const tabs = [
    { href: base, label: t("tabOverview"), active: pathname === base },
    { href: `${base}/board`, label: t("tabBoard"), active: pathname.startsWith(`${base}/board`) },
  ];

  return (
    <nav aria-label={t("tabsLabel")} className="-mb-px flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab.active
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
