import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

import type { FieldError, ProjectField } from "./schema";

/** A titled group of fields. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Label, input, and either the error or a hint under it. */
export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: ProjectField;
  error?: FieldError;
  hint?: string;
  children: ReactNode;
}) {
  const t = useTranslations("ProjectForm.errors");
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive" data-testid={`error-${name}`}>
          {t(error)}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
