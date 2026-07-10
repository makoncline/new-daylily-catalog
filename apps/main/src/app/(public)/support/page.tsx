import type { Metadata } from "next";
import { getPublicFeedbackUrl } from "@/hooks/use-feedback-url";

export const metadata: Metadata = {
  title: "Support | Daylily Catalog",
  description: "Get help with Daylily Catalog or send an idea or bug report.",
};

export default function SupportPage() {
  const feedbackUrl = getPublicFeedbackUrl();

  return (
    <div className="bg-[#f6f8f3] px-4 py-12 lg:px-8 lg:py-16">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-4xl font-semibold text-[#142118]">Support</h1>
          <p className="text-lg leading-8 text-[#536357]">
            Need help with Daylily Catalog? Send us an email or use the feedback
            form.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#142118]">
            Ideas And Bugs
          </h2>
          <p className="text-base leading-7 text-[#536357]">
            Share a feature idea or report something that is not working with
            the{" "}
            <a
              className="font-semibold text-[#173126] underline underline-offset-4"
              href={feedbackUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              feedback form
            </a>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#142118]">Email</h2>
          <p className="text-base leading-7 text-[#536357]">
            For account help, privacy requests, takedown requests, or general
            questions, email{" "}
            <a
              className="font-semibold text-[#173126] underline underline-offset-4"
              href="mailto:admin@daylilycatalog.com"
            >
              admin@daylilycatalog.com
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
