import { redirect } from "next/navigation";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

export default function StartMembershipRedirectPage() {
  redirect(
    `${SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH}?step=start-membership`,
  );
}
