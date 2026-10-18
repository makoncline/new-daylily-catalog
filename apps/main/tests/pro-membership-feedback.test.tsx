import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PostHog,
  SurveyQuestionType,
  SurveyType,
  type Survey,
} from "posthog-js";
import { PostHog as FullPostHog } from "posthog-js/full";
import { ProMembershipFeedback } from "@/components/pro-membership-feedback";
import {
  captureProMembershipFeedback,
  loadProMembershipFeedback,
  PRO_FEEDBACK_MAX_LENGTH,
  PRO_FEEDBACK_QUESTION_ID,
  PRO_FEEDBACK_SURVEY_ID,
} from "@/lib/analytics/pro-membership-feedback";

const getClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/posthog", () => ({ getPosthogClient: getClient }));

const survey: Survey = {
  id: PRO_FEEDBACK_SURVEY_ID,
  name: "Pro membership feedback",
  type: SurveyType.API,
  feature_flag_keys: null,
  linked_flag_key: null,
  targeting_flag_key: null,
  internal_targeting_flag_key: null,
  appearance: null,
  conditions: null,
  start_date: null,
  end_date: null,
  current_iteration: null,
  current_iteration_start_date: null,
  questions: [
    {
      id: PRO_FEEDBACK_QUESTION_ID,
      type: SurveyQuestionType.Open,
      question:
        "What stops you from joining Pro, and what would make it worth paying for?",
    },
  ],
};

const capture = vi.fn();
const unsubscribe = vi.fn();
const subscribe = vi.fn();
const client = {
  is_capturing: () => true,
  capture,
  onActiveMatchingSurveysChanged: subscribe,
};

beforeEach(() => {
  vi.clearAllMocks();
  getClient.mockResolvedValue(client);
  capture.mockReturnValue({ event: "captured" });
  subscribe.mockImplementation((callback) => {
    callback([survey]);
    return unsubscribe;
  });
});
afterEach(() => vi.useRealTimers());

describe("optional Pro feedback", () => {
  it("loads only after a click, cancels without sending, and returns focus", async () => {
    const user = userEvent.setup();
    render(<ProMembershipFeedback />);
    const trigger = screen.getByRole("button", { name: /Not ready for Pro/ });
    expect(getClient).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    const input = await screen.findByRole("textbox");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("maxlength", "2000");
    await user.type(input, "I need a smaller plan.");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
    expect(capture.mock.calls.map(([event]) => event)).toEqual([
      "survey shown",
      "survey dismissed",
    ]);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("sends one bounded answer with the supported survey contract", async () => {
    const user = userEvent.setup();
    render(<ProMembershipFeedback />);
    await user.click(screen.getByRole("button", { name: /Not ready for Pro/ }));
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, {
      target: { value: `  ${"x".repeat(PRO_FEEDBACK_MAX_LENGTH - 4)}  ` },
    });
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(
      await screen.findByText(/Thanks for helping us improve Pro/),
    ).toBeVisible();
    expect(capture).toHaveBeenLastCalledWith("survey sent", {
      $survey_id: survey.id,
      $survey_iteration: null,
      $survey_submission_id: expect.any(String),
      $survey_completed: true,
      $survey_questions: [
        {
          id: PRO_FEEDBACK_QUESTION_ID,
          question: survey.questions[0]!.question,
        },
      ],
      [`$survey_response_${PRO_FEEDBACK_QUESTION_ID}`]: "x".repeat(
        PRO_FEEDBACK_MAX_LENGTH - 4,
      ),
    });
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(capture.mock.calls.map(([event]) => event)).toEqual([
      "survey shown",
      "survey sent",
    ]);

    expect(
      await captureProMembershipFeedback(survey, {
        type: "sent",
        answer: "x".repeat(2001),
        submissionId: "oversized",
      }),
    ).toBe(false);
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it("keeps the answer and submission ID when capture fails and the user retries", async () => {
    const user = userEvent.setup();
    render(<ProMembershipFeedback />);
    await user.click(screen.getByRole("button", { name: /Not ready for Pro/ }));
    await user.type(
      await screen.findByRole("textbox"),
      "I need inventory history.",
    );
    capture.mockReturnValueOnce(undefined);
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be sent",
    );
    expect(screen.getByRole("textbox")).toHaveValue(
      "I need inventory history.",
    );
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    await screen.findByText(/Thanks for helping us improve Pro/);
    expect(capture.mock.calls[1]![1].$survey_submission_id).toBe(
      capture.mock.calls[2]![1].$survey_submission_id,
    );
  });

  it.each(["disabled", "load failure"])(
    "keeps the support option when analytics has %s",
    async (mode) => {
      if (mode === "disabled") getClient.mockResolvedValue(null);
      else getClient.mockRejectedValue(new Error("blocked"));
      const user = userEvent.setup();
      render(<ProMembershipFeedback />);
      await user.click(
        screen.getByRole("button", { name: /Not ready for Pro/ }),
      );
      expect(
        await screen.findByText(/question is not available/),
      ).toBeVisible();
      expect(
        screen.getByRole("link", { name: "Use the feedback form" }),
      ).toHaveAttribute("href", expect.stringContaining("coda.io/form/"));
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(capture).not.toHaveBeenCalled();
    },
  );

  it("waits for eligible survey updates and times out for a draft or previously answered survey", async () => {
    vi.useFakeTimers();
    subscribe.mockImplementation((callback) => {
      callback([]);
      setTimeout(() => callback([survey]), 100);
      return unsubscribe;
    });
    const loaded = loadProMembershipFeedback();
    await vi.advanceTimersByTimeAsync(100);
    expect(await loaded).toBe(survey);
    subscribe.mockImplementation((callback) => {
      callback([]);
      return unsubscribe;
    });
    const unavailable = loadProMembershipFeedback();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await unavailable).toBeNull();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("respects the real SDK internal targeting flag after dismissal", async () => {
    vi.useFakeTimers();
    const sdk = new FullPostHog();
    sdk.init("phc_repeat_fixture", {
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      advanced_enable_surveys: true,
      bootstrap: {
        featureFlags: { "survey-targeting-cb729a24d6-custom": true },
      },
    });
    sdk.opt_in_capturing();
    sdk.register({
      $surveys: [
        {
          ...survey,
          start_date: "2026-10-17T00:00:00Z",
          schedule: "always",
          internal_targeting_flag_key: "survey-targeting-cb729a24d6-custom",
          feature_flag_keys: [
            {
              key: "internal_targeting_flag_key",
              value: "survey-targeting-cb729a24d6-custom",
            },
          ],
        },
      ],
    });
    getClient.mockResolvedValue(sdk);
    expect(await loadProMembershipFeedback()).toMatchObject({ id: survey.id });
    expect(
      await captureProMembershipFeedback(survey, { type: "dismissed" }),
    ).toBe(true);
    sdk.featureFlags.overrideFeatureFlags({
      flags: { "survey-targeting-cb729a24d6-custom": false },
    });
    const eligible = await new Promise<Survey[]>((resolve) =>
      sdk.getActiveMatchingSurveys(resolve),
    );
    expect(sdk.getFeatureFlag("survey-targeting-cb729a24d6-custom")).toBe(
      false,
    );
    expect(eligible).toEqual([]);
    const unavailable = loadProMembershipFeedback();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await unavailable).toBeNull();
    sdk.opt_out_capturing();
    vi.clearAllTimers();
  });

  it.each([false, true])(
    "preserves the real SDK identity and seen-state contract (identified: %s)",
    async (identified) => {
      vi.useFakeTimers();
      const sdk = new PostHog();
      sdk.init("phc_integration_test", {
        persistence: "memory",
        autocapture: false,
        capture_pageview: false,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        bootstrap: { distinctID: "anonymous-feedback-test" },
      });
      sdk.opt_in_capturing();
      if (identified) sdk.identify("existing-member-test");
      const distinctId = sdk.get_distinct_id();
      getClient.mockResolvedValue(sdk);
      const spy = vi.spyOn(sdk, "capture");
      await act(async () => {
        expect(
          await captureProMembershipFeedback(survey, {
            type: "sent",
            answer: "A smaller plan",
            submissionId: crypto.randomUUID(),
          }),
        ).toBe(true);
      });
      const sent = spy.mock.results.at(-1)?.value;
      expect(sent?.properties.distinct_id).toBe(distinctId);
      expect(
        sent?.properties[`$survey_response_${PRO_FEEDBACK_QUESTION_ID}`],
      ).toBe("A smaller plan");
      expect(sent?.$set?.[`$survey_responded/${survey.id}`]).toBe(true);
      expect(sdk.get_distinct_id()).toBe(distinctId);
      sdk.opt_out_capturing();
      vi.clearAllTimers();
    },
  );
});
