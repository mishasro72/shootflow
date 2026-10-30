"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import type { ProjectFormState } from "./actions";
import type { FieldError, ProjectField, ProjectFormValues } from "./schema";

type Props = {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  defaultValues: ProjectFormValues;
  timeZones: string[];
  submitLabel: string;
  cancelHref: string;
};

const initialState: ProjectFormState = { status: "idle", attempt: 0 };

export function ProjectForm({ action, defaultValues, timeZones, submitLabel, cancelHref }: Props) {
  const t = useTranslations("ProjectForm");
  const [state, formAction] = useActionState(action, initialState);

  // After a failed submit, show what was typed. `key` re-creates the form so every
  // input picks up these values (React resets a form after its action runs).
  const values = state.status === "error" ? state.values : defaultValues;
  const errors = state.status === "error" ? state.errors : {};

  /** Shared wiring for one input: id, name, current value and error state. */
  const field = (name: ProjectField) => ({
    id: name,
    name,
    defaultValue: values[name],
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-8" noValidate>
      {state.status === "error" && state.formError && (
        <Alert variant="destructive" data-testid="form-error">
          {t(`formErrors.${state.formError}`)}
        </Alert>
      )}

      <Section title={t("sectionShoot")}>
        <Field label={t("title")} name="title" error={errors.title}>
          <Input {...field("title")} required maxLength={200} placeholder={t("titlePlaceholder")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("shootDate")} name="shootDate" error={errors.shootDate}>
            <Input {...field("shootDate")} type="date" />
          </Field>
          <Field label={t("startTime")} name="startTime" error={errors.startTime}>
            <Input {...field("startTime")} type="time" />
          </Field>
          <Field label={t("endTime")} name="endTime" error={errors.endTime}>
            <Input {...field("endTime")} type="time" />
          </Field>
        </div>

        <Field label={t("timezone")} name="timezone" error={errors.timezone} hint={t("timezoneHint")}>
          <NativeSelect {...field("timezone")}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </Section>

      <Section title={t("sectionLocation")}>
        <Field label={t("locationName")} name="locationName" error={errors.locationName}>
          <Input {...field("locationName")} maxLength={200} placeholder={t("locationNamePlaceholder")} />
        </Field>
        <Field label={t("locationAddress")} name="locationAddress" error={errors.locationAddress}>
          <Input {...field("locationAddress")} maxLength={300} autoComplete="street-address" />
        </Field>
      </Section>

      <Section title={t("sectionClient")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("clientName")} name="clientName" error={errors.clientName}>
            <Input {...field("clientName")} maxLength={200} autoComplete="off" />
          </Field>
          <Field label={t("clientEmail")} name="clientEmail" error={errors.clientEmail}>
            <Input {...field("clientEmail")} type="email" inputMode="email" maxLength={320} autoComplete="off" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("clientLocale")} name="clientLocale" error={errors.clientLocale} hint={t("clientLocaleHint")}>
            <NativeSelect {...field("clientLocale")}>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </NativeSelect>
          </Field>
          <Field label={t("retouchLimit")} name="retouchLimit" error={errors.retouchLimit} hint={t("retouchLimitHint")}>
            <Input {...field("retouchLimit")} type="number" inputMode="numeric" min={0} max={500} />
          </Field>
        </div>
      </Section>

      <Section title={t("sectionNotes")}>
        <Field label={t("notes")} name="notes" error={errors.notes}>
          <Textarea {...field("notes")} maxLength={4000} rows={4} placeholder={t("notesPlaceholder")} />
        </Field>
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="lg">
          <Link href={cancelHref}>{t("cancel")}</Link>
        </Button>
        <SubmitButton className="sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
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
