import { Aperture } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const tMeta = await getTranslations("Metadata");

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
          <Aperture className="size-5 text-golden" aria-hidden />
          {tMeta("title")}
        </span>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center pb-24">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">{t("lead")}</p>
        <p
          data-testid="build-status"
          className="mt-10 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="size-1.5 rounded-full bg-golden" aria-hidden />
          {t("status")}
        </p>
      </main>
    </div>
  );
}
