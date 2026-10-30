import { FolderKanban, Settings, type LucideIcon } from "lucide-react";

/** One entry of the photographer navigation; `labelKey` lives under `Nav` in messages. */
export type NavItem = {
  href: string;
  labelKey: "projects" | "settings";
  icon: LucideIcon;
  /** Whether this item is the current section, e.g. /dashboard/projects/123 is "projects". */
  match: (pathname: string) => boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "projects",
    icon: FolderKanban,
    match: (pathname) => pathname === "/dashboard" || pathname.startsWith("/dashboard/projects"),
  },
  {
    href: "/dashboard/settings",
    labelKey: "settings",
    icon: Settings,
    match: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
];
