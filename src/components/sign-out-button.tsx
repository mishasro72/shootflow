import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A plain HTML form posting to /auth/signout. It works even before JavaScript loads,
 * and POST (not a link) means a prefetch can never sign anyone out.
 */
export async function SignOutButton({
  compact = false,
  className,
}: {
  /** Icon only, for the narrow phone header. */
  compact?: boolean;
  className?: string;
}) {
  const t = await getTranslations("Dashboard");

  return (
    <form action="/auth/signout" method="post" className={className}>
      <Button
        type="submit"
        variant="ghost"
        size={compact ? "icon" : "sm"}
        aria-label={t("signOut")}
        className={cn(!compact && "w-full justify-start")}
      >
        <LogOut aria-hidden />
        {!compact && t("signOut")}
      </Button>
    </form>
  );
}
