"use client";

import { Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Archiving takes two clicks: the first one only asks "Sure?". This avoids an accidental
 * tap on a phone without a browser pop-up.
 */
export function ArchiveButton({ action }: { action: () => Promise<void> }) {
  const t = useTranslations("Project");
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Archive aria-hidden />
        {t("archive")}
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t("archiveConfirm")}</span>
      <Button type="submit" variant="destructive" size="sm">
        {t("archiveYes")}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        {t("archiveNo")}
      </Button>
    </form>
  );
}
