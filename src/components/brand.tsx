import { Aperture } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { cn } from "@/lib/utils";

export async function Brand({ href = "/", className }: { href?: string; className?: string }) {
  const t = await getTranslations("Metadata");
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-base font-semibold tracking-tight", className)}
    >
      <Aperture className="size-5 text-golden" aria-hidden />
      {t("title")}
    </Link>
  );
}
