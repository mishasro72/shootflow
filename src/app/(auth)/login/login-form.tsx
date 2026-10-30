"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { sendMagicLink, signInWithPassword, type AuthFormState } from "../actions";
import { FormMessage } from "../form-message";

const initial: AuthFormState = { status: "idle" };

type Mode = "password" | "magic";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("Auth");
  const [mode, setMode] = useState<Mode>("password");
  const [passwordState, passwordAction] = useActionState(signInWithPassword, initial);
  const [magicState, magicAction] = useActionState(sendMagicLink, initial);
  const state = mode === "password" ? passwordState : magicState;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("signInMethod")} className="grid grid-cols-2 rounded-md border p-0.5">
        {(["password", "magic"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-sm font-medium transition-colors",
              mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "password" ? t("methodPassword") : t("methodMagicLink")}
          </button>
        ))}
      </div>

      <form action={mode === "password" ? passwordAction : magicAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.status !== "idle" ? state.email : undefined}
          />
        </div>

        {mode === "password" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("magicLinkHint")}</p>
        )}

        <FormMessage state={state} />

        <SubmitButton>{mode === "password" ? t("signIn") : t("sendMagicLink")}</SubmitButton>
      </form>
    </div>
  );
}
