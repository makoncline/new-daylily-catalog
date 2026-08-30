"use client";

import { Button } from "@daylily-catalog/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@daylily-catalog/ui/components/field";
import { Input } from "@daylily-catalog/ui/components/input";
import { Textarea } from "@daylily-catalog/ui/components/textarea";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

export function ContactForm() {
  const router = useRouter();
  const openedAt = React.useRef(new Date().toISOString());
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <form
      className="max-w-2xl"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus("");
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/forms", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: "contact",
              name: form.get("name"),
              email: form.get("email"),
              message: form.get("message"),
              website: form.get("website"),
              openedAt: openedAt.current,
            }),
          });
          if (response.status === 409) {
            const body = (await response.json().catch(() => null)) as {
              code?: unknown;
            } | null;
            if (body?.code === "form_expired") {
              openedAt.current = new Date().toISOString();
              setStatus(
                "This form expired. Review your message, wait a moment, and send it again.",
              );
            } else {
              setStatus("Your message changed. Review it and try again.");
            }
            return;
          }
          if (!response.ok) {
            throw new Error("The form endpoint rejected the request.");
          }
          router.push("/thanks?from=contact");
        } catch {
          setStatus("Your message was not sent. Check the form and try again.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contact-name">Name</FieldLabel>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-email">Email</FieldLabel>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <Textarea
            id="contact-message"
            name="message"
            required
            rows={6}
            maxLength={5000}
          />
        </Field>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          <Send data-icon="inline-start" aria-hidden="true" />
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
        <p aria-live="polite" className="text-destructive text-sm">
          {status}
        </p>
      </FieldGroup>
    </form>
  );
}
