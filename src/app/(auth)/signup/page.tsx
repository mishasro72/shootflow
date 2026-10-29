import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("signUpTitle") };
}

export default async function SignupPage() {
  const t = await getTranslations("Auth");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">{t("signUpTitle")}</CardTitle>
        <CardDescription>{t("signUpLead")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("haveAccount")}&nbsp;
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("signInLink")}
        </Link>
      </CardFooter>
    </Card>
  );
}
