import { FEEDBACK_CONFIG } from "@/config/constants";
import { api } from "@/trpc/react";

export function useFeedbackUrl() {
  const { data: user } = api.user.getCurrentUser.useQuery();

  const feedbackUrl = new URL(FEEDBACK_CONFIG.FORM_URL);
  feedbackUrl.searchParams.set("board-slug", FEEDBACK_CONFIG.BOARD_SLUG);

  if (user) {
    feedbackUrl.searchParams.set("email", user.email);
  }
  return feedbackUrl;
}