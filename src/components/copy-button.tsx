"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Copies `value` to the clipboard and says "Copied" for two seconds. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (e.g. no permission); the link stays visible to copy by hand.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? t("copied") : label}</span>
    </Button>
  );
}
