"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, labelKey: "themeLight" },
  { value: "dark", icon: Moon, labelKey: "themeDark" },
  { value: "system", icon: Monitor, labelKey: "themeSystem" },
] as const;

const subscribe = () => () => {};

export function ThemeSwitcher({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser; render neutral until hydrated.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div
      role="group"
      aria-label={t("theme")}
      className={cn("inline-flex rounded-md border p-0.5", className)}
    >
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            className={cn(
              "rounded-[calc(var(--radius)-4px)] p-1.5 transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
