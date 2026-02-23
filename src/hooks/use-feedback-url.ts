import { FEEDBACK_CONFIG } from "@/config/constants";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";

export function useFeedbackUrl() {
  const { isLoaded, userId } = useAuth();
  const { data: user } = api.user.getCurrentUser.useQuery(undefined, {
    enabled: isLoaded && Boolean(userId),
  });

  const feedbackUrl = new URL(FEEDBACK_CONFIG.FORM_URL);
  feedbackUrl.searchParams.set("board-slug", FEEDBACK_CONFIG.BOARD_SLUG);

  if (user?.clerk?.email) {
    feedbackUrl.searchParams.set("email", user.clerk.email);
  }

  return feedbackUrl.toString();
}
