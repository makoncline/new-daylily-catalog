import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingCheckoutSuccessRedirect({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sessionId = (await searchParams).session_id;
  if (!sessionId) {
    redirect("/catalog-importer");
  }

  redirect(
    `/catalog-importer/checkout/success?session_id=${encodeURIComponent(
      sessionId,
    )}`,
  );
}
