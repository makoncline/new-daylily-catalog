import { redirect } from "next/navigation";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

export default function StartOnboardingPageRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    for (const item of value ?? []) {
      params.append(key, item);
    }
  }

  const query = params.toString();
  const onboardingPath = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;
  redirect(query ? `${onboardingPath}?${query}` : onboardingPath);
}
