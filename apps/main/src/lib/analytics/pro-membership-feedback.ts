"use client";

import type { Survey } from "posthog-js";
import { getPosthogClient } from "@/lib/analytics/posthog";

export const PRO_FEEDBACK_SURVEY_ID = "01a14ae7-e8c2-0000-5334-8281a516a6af";
export const PRO_FEEDBACK_QUESTION_ID = "c92adf56-4cfc-41cd-907c-dfc63b4ce308";
export const PRO_FEEDBACK_MAX_LENGTH = 2000;

export function loadProMembershipFeedback(): Promise<Survey | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    const finish = (survey: Survey | null) => {
      settled = true;
      clearTimeout(timeout);
      unsubscribe?.();
      resolve(survey);
    };
    const timeout = setTimeout(() => finish(null), 5000);

    void getPosthogClient()
      .then((client) => {
        if (settled) return;
        if (!client?.is_capturing()) {
          finish(null);
          return;
        }
        unsubscribe = client.onActiveMatchingSurveysChanged((surveys) => {
          const survey = surveys.find(
            (item) =>
              item.id === PRO_FEEDBACK_SURVEY_ID &&
              item.type === "api" &&
              item.questions.length === 1 &&
              item.questions[0]?.id === PRO_FEEDBACK_QUESTION_ID &&
              item.questions[0].type === "open",
          );
          if (survey) finish(survey);
        });
        if (settled) unsubscribe();
      })
      .catch(() => finish(null));
  });
}

type FeedbackAction =
  | { type: "shown" | "dismissed" }
  | { type: "sent"; answer: string; submissionId: string };

export async function captureProMembershipFeedback(
  survey: Survey,
  action: FeedbackAction,
) {
  const client = await getPosthogClient();
  if (!client?.is_capturing()) return false;

  const properties = {
    $survey_id: survey.id,
    $survey_iteration: survey.current_iteration,
  };
  if (action.type === "sent") {
    const answer = action.answer.trim();
    if (!answer || answer.length > PRO_FEEDBACK_MAX_LENGTH) return false;

    return Boolean(
      client.capture("survey sent", {
        ...properties,
        $survey_submission_id: action.submissionId,
        $survey_completed: true,
        $survey_questions: survey.questions.map(({ id, question }) => ({
          id,
          question,
        })),
        [`$survey_response_${PRO_FEEDBACK_QUESTION_ID}`]: answer,
      }),
    );
  }

  return Boolean(client.capture(`survey ${action.type}`, properties));
}
