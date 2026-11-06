"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { PinFormState } from "../portal-actions";

type Props = {
  hasPin: boolean;
  action: (prev: PinFormState, formData: FormData) => Promise<PinFormState>;
  clearAction: () => Promise<void>;
};

const initialState: PinFormState = { status: "idle", attempt: 0 };

/** Sets, changes or removes the client's PIN. The PIN itself is never shown again. */
export function PinForm({ hasPin, action, clearAction }: Props) {
  const t = useTranslations("Project");
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-2" data-testid="pin">
      <p className="text-muted-foreground" data-testid="pin-state">
        {hasPin ? t("pinOn") : t("pinOff")}
      </p>
      {/* key: a fresh, empty input after every submit, so the PIN does not stay on screen. */}
      <form key={state.attempt} action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pin">{hasPin ? t("pinChange") : t("pinLabel")}</Label>
          <Input
            id="pin"
            name="pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            className="w-28"
            aria-invalid={state.status === "invalid" ? true : undefined}
            aria-describedby={state.status === "invalid" ? "pin-error" : undefined}
          />
        </div>
        <SubmitButton className="w-auto">{t("pinSave")}</SubmitButton>
      </form>
      {state.status === "invalid" && (
        <p id="pin-error" className="text-sm text-destructive">
          {t("pinInvalid")}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("pinError")}
        </p>
      )}
      {state.status === "saved" && (
        <p role="status" className="text-sm">
          {t("pinSaved")}
        </p>
      )}
      {hasPin && (
        <form action={clearAction}>
          <Button type="submit" variant="ghost" size="sm">
            {t("pinRemove")}
          </Button>
        </form>
      )}
    </div>
  );
}
