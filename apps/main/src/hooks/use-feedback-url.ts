import { FEEDBACK_CONFIG } from "@/config/constants";

export function getPublicFeedbackUrl() {
  const feedbackUrl = new URL(FEEDBACK_CONFIG.FORM_URL);
  feedbackUrl.searchParams.set("board-slug", FEEDBACK_CONFIG.BOARD_SLUG);

  return feedbackUrl.toString();
}

export function useFeedbackUrl() {
  return getPublicFeedbackUrl();
}
