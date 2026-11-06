import { CalendarPlus, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPhotographerContext } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { rotateCalendarFeed } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const context = await getPhotographerContext();
  if (!context) redirect("/login");

  const t = await getTranslations("Settings");
  const tCommon = await getTranslations("Common");
  const env = getEnv();

  // The feed token is readable by studio members through RLS; only the server can change it.
  const supabase = await createSupabaseServerClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("calendar_feed_token")
    .eq("id", context.workspace.id)
    .maybeSingle();

  const feedUrl = workspace
    ? new URL(`/api/calendar/${workspace.calendar_feed_token}/shoots.ics`, env.NEXT_PUBLIC_APP_URL).toString()
    : null;
  // webcal:// is the same address; it tells the system to open a calendar app and subscribe.
  const subscribeUrl = feedUrl?.replace(/^https?:/, "webcal:");
  const canRotate = context.role === "OWNER" && Boolean(env.SUPABASE_SECRET_KEY);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("lead")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearanceTitle")}</CardTitle>
          <CardDescription>{t("appearanceLead")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">{tCommon("theme")}</span>
            <ThemeSwitcher />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">{tCommon("language")}</span>
            <LocaleSwitcher />
          </div>
        </CardContent>
      </Card>

      {feedUrl && subscribeUrl && (
        <Card>
          <CardHeader>
            <CardTitle>{t("calendarTitle")}</CardTitle>
            <CardDescription>{t("calendarLead")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <code data-testid="calendar-feed" className="block truncate rounded-md bg-muted px-2 py-1.5 text-xs">
              {feedUrl}
            </code>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <a href={subscribeUrl}>
                  <CalendarPlus aria-hidden />
                  {t("calendarSubscribe")}
                </a>
              </Button>
              <CopyButton value={feedUrl} label={t("calendarCopy")} />
            </div>
            <p className="text-muted-foreground">{t("calendarHint")}</p>
            {canRotate && (
              <ConfirmButton
                action={rotateCalendarFeed}
                label={t("calendarRotate")}
                question={t("calendarRotateConfirm")}
                yes={t("calendarRotateYes")}
                no={t("calendarRotateNo")}
                icon={<RefreshCw aria-hidden />}
                testId="rotate-feed"
              />
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
