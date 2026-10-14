import { getTranslations } from "next-intl/server";
import { getMyStandup } from "@/server/queries/standup";
import { Section } from "@/components/ui-biib/Section";
import { StandupForm } from "@/components/staff/standup/standup-form";

/** Bosh sahifadagi kunlik hisobot bloki — har bir ichki xodim bugungi standupini toʻldiradi. */
export async function StandupWidget({ userId }: { userId: string }) {
  const t = await getTranslations("dashboard.standup");
  const data = await getMyStandup(userId);
  return (
    <Section title={t("title")}>
      <StandupForm initial={data} />
    </Section>
  );
}
