"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signUp, type AuthFormState } from "../actions";
import { FormMessage } from "../form-message";
import { SubmitButton } from "../submit-button";

const initial: AuthFormState = { status: "idle" };

export function SignupForm() {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(signUp, initial);

  if (state.status === "sent") return <FormMessage state={state} />;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={120} />
        <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.status === "error" ? state.email : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      <FormMessage state={state} />

      <SubmitButton>{t("createAccount")}</SubmitButton>
    </form>
  );
}
