import { CalendarDays, Images, Shirt } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Placeholder for the client portal. It deliberately reads nothing from the database:
 * checking the token and loading the shoot arrives in step 8 of the plan.
 */
export default async function PortalPage() {
  const t = await getTranslations("Portal");

  const sections = [
    { icon: CalendarDays, title: t("shootTitle"), lead: t("shootLead") },
    { icon: Shirt, title: t("conceptTitle"), lead: t("conceptLead") },
    { icon: Images, title: t("galleryTitle"), lead: t("galleryLead") },
  ];

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("lead")}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {sections.map(({ icon: Icon, title, lead }) => (
          <li key={title} className="flex gap-3 rounded-xl border bg-card p-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-golden" aria-hidden />
            <div>
              <h2 className="font-medium">{title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{lead}</p>
            </div>
          </li>
        ))}
      </ul>

      <p data-testid="portal-placeholder" className="text-xs text-muted-foreground">
        {t("comingSoon")}
      </p>
    </div>
  );
}
