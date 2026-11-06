"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  /** Runs on the second click. */
  action: () => Promise<void>;
  /** The first button, e.g. "New link". */
  label: string;
  /** What will happen, shown with the second button. */
  question: string;
  yes: string;
  no: string;
  icon?: ReactNode;
  testId?: string;
};

/**
 * Two clicks for anything that cannot be undone: the first only asks. Works the same on a
 * phone and with a keyboard, with no browser pop-up.
 */
export function ConfirmButton({ action, label, question, yes, no, icon, testId }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)} data-testid={testId}>
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{question}</span>
      <Button type="submit" variant="destructive" size="sm">
        {yes}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        {no}
      </Button>
    </form>
  );
}
