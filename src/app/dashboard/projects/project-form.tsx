"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import type { ProjectFormState } from "./actions";
import { Field, Section } from "./form-field";
import { LocationFields } from "./location-fields";
import type { ProjectField, ProjectFormValues } from "./schema";

type Props = {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  defaultValues: ProjectFormValues;
  timeZones: string[];
  /** Whether the server can search Google Places (it has an API key). */
  mapsEnabled: boolean;
  submitLabel: string;
  cancelHref: string;
};

const initialState: ProjectFormState = { status: "idle", attempt: 0 };

export function ProjectForm({ action, defaultValues, timeZones, mapsEnabled, submitLabel, cancelHref }: Props) {
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
      </Section>

      <Section title={t("sectionLocation")}>
        <LocationFields defaults={values} errors={errors} timeZones={timeZones} mapsEnabled={mapsEnabled} />
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
