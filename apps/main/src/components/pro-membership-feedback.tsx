"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Survey } from "posthog-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { getPublicFeedbackUrl } from "@/hooks/use-feedback-url";
import {
  captureProMembershipFeedback,
  loadProMembershipFeedback,
  PRO_FEEDBACK_MAX_LENGTH,
} from "@/lib/analytics/pro-membership-feedback";

export function ProMembershipFeedback() {
  const [open, setOpen] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "sending" | "complete" | "unavailable" | "failed"
  >("loading");
  const submissionId = useRef("");
  const requestId = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadProMembershipFeedback()
      .then(async (loadedSurvey) => {
        if (cancelled) return;
        if (!loadedSurvey) {
          setStatus("unavailable");
          return;
        }
        const captured = await captureProMembershipFeedback(loadedSurvey, {
          type: "shown",
        });
        if (cancelled) return;
        if (!captured) {
          setStatus("unavailable");
          return;
        }
        setSurvey(loadedSurvey);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const changeOpen = (nextOpen: boolean) => {
    requestId.current += 1;
    if (nextOpen) {
      setSurvey(null);
      setAnswer("");
      setStatus("loading");
      submissionId.current = crypto.randomUUID();
    } else if (survey && status !== "complete" && status !== "sending") {
      void captureProMembershipFeedback(survey, { type: "dismissed" }).catch(
        () => undefined,
      );
    }
    setOpen(nextOpen);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!survey || status === "sending" || !answer.trim()) return;
    const currentRequest = requestId.current;
    setStatus("sending");
    try {
      const captured = await captureProMembershipFeedback(survey, {
        type: "sent",
        answer,
        submissionId: submissionId.current,
      });
      if (currentRequest === requestId.current) {
        setStatus(captured ? "complete" : "failed");
      }
    } catch {
      if (currentRequest === requestId.current) setStatus("failed");
    }
  };

  const showForm =
    survey &&
    (status === "ready" || status === "sending" || status === "failed");

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm">
          Not ready for Pro? Tell us why
        </Button>
      </DialogTrigger>
      <DialogContent className="h-auto">
        <DialogHeader>
          <DialogTitle>Help us improve Pro</DialogTitle>
          <DialogDescription>
            Feedback is optional. You can close this and continue at any time.
          </DialogDescription>
        </DialogHeader>
        {status === "loading" ? <p role="status">Loading feedback…</p> : null}
        {status === "unavailable" ? (
          <p role="status">
            This feedback question is not available. You can still use our
            feedback form.
          </p>
        ) : null}
        {status === "complete" ? (
          <p role="status">Thanks for helping us improve Pro.</p>
        ) : null}
        {showForm ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void submit(event)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={inputId}>
                  {survey.questions[0]?.question}
                </FieldLabel>
                <Textarea
                  id={inputId}
                  ref={textareaRef}
                  className="ph-no-capture min-h-32"
                  autoComplete="off"
                  aria-describedby={`${inputId}-description`}
                  maxLength={PRO_FEEDBACK_MAX_LENGTH}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={status === "sending"}
                  required
                />
                <FieldDescription id={`${inputId}-description`}>
                  Do not include passwords, payment details, or private
                  information. Maximum 2,000 characters.
                </FieldDescription>
              </Field>
            </FieldGroup>
            {status === "failed" ? (
              <p role="alert">
                Feedback could not be sent. Your answer is still here. Try again
                or use our feedback form.
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={status === "sending" || !answer.trim()}
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
        {status === "unavailable" || status === "failed" ? (
          <Button asChild variant="link" size="sm">
            <a
              href={getPublicFeedbackUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Use the feedback form
            </a>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
