import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { LinkButton } from "@/components/layout/link-button";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Message received",
    robots: { index: false, follow: false },
  };
}

export default async function ThanksPage() {
  return (
    <section className="mx-auto grid max-w-2xl justify-items-center gap-5 py-20 text-center">
      <CheckCircle2 className="text-primary size-12" aria-hidden="true" />
      <h1 className="font-serif text-4xl font-semibold">Thank you</h1>
      <p className="text-muted-foreground text-lg">
        Your message was received. The seller will reply by email.
      </p>
      <LinkButton href="/catalogs">Return to the catalogs</LinkButton>
    </section>
  );
}
