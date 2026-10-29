import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";

import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("signInTitle") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const { next, error, notice } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">{t("signInTitle")}</CardTitle>
        <CardDescription>{t("signInLead")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error === "link" && <Alert variant="destructive">{t("errors.linkInvalid")}</Alert>}
        {notice === "other-browser" && (
          <Alert variant="success" data-testid="auth-notice">
            {t("otherBrowser")}
          </Alert>
        )}
        <LoginForm next={safeNextPath(next)} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")}&nbsp;
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("signUpLink")}
        </Link>
      </CardFooter>
    </Card>
  );
}
