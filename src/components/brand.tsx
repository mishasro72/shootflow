import { Aperture } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The ShootFlow logo and name. Pass `href={null}` where a link makes no sense,
 * e.g. in the client portal, where clients should not wander off to the app.
 */
export async function Brand({ href = "/", className }: { href?: string | null; className?: string }) {
  const t = await getTranslations("Metadata");
  const classes = cn("inline-flex items-center gap-2 text-base font-semibold tracking-tight", className);
  const content = (
    <>
      <Aperture className="size-5 text-golden" aria-hidden />
      {t("title")}
    </>
  );

  if (href === null) return <span className={classes}>{content}</span>;
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
