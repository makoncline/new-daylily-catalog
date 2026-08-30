import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact",
    description: "Ask about daylily availability or plan a visit.",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:py-14">
      <section className="grid gap-5">
        <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
          Contact
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-6xl">
          Send us a message
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Ask about availability, an order, or a garden visit. We will reply by
          email.
        </p>
        <ContactForm />
      </section>
      <aside className="bg-muted/40 rounded-xl border p-6">
        <h2 className="font-serif text-2xl font-semibold">Before you order</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Availability can change during digging and shipping. An inquiry
          reserves nothing until the seller confirms it.
        </p>
      </aside>
    </div>
  );
}
