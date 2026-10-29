"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";

import type { AuthFormState } from "./actions";

export function FormMessage({ state }: { state: AuthFormState }) {
  const t = useTranslations("Auth");

  if (state.status === "error") {
    return (
      <Alert variant="destructive" data-testid="auth-error">
        {t(`errors.${state.error}`)}
      </Alert>
    );
  }

  if (state.status === "sent") {
    return (
      <Alert variant="success" data-testid="auth-sent" className="flex gap-3">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <span>{t("checkEmail", { email: state.email })}</span>
      </Alert>
    );
  }

  return null;
}
