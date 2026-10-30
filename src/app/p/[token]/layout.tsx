import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * Client portal pages live behind a secret link (/p/{token}). Search engines must not
 * index them, and the token must not leak to other sites through the Referer header.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** Single-column, phone-first shell for the client portal. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-4">
        <Brand href={null} />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}
