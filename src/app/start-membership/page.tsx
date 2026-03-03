import type { HTMLAttributes, ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle2,
  Dot,
  Sparkles,
} from "lucide-react";
import {
  SellerLandingAuthCta,
  SellerLandingExampleLink,
  SellerLandingViewTracker,
} from "./_components/seller-landing-actions";
import { PRO_FEATURES, METADATA_CONFIG } from "@/config/constants";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { IMAGES } from "@/lib/constants/images";
import { cn } from "@/lib/utils";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: `Create Your Daylily Catalog | ${METADATA_CONFIG.SITE_NAME}`,
  description:
    "Create a public daylily seller catalog with listings, photos, and cultivar-linked data. Start a free trial and get discovered in catalog browsing and search.",
  alternates: {
    canonical: "/start-membership",
  },
  robots: "index, follow, max-image-preview:large",
  openGraph: {
    title: `Create Your Daylily Catalog | ${METADATA_CONFIG.SITE_NAME}`,
    description:
      "Publish your daylily catalog, add listings with photos and prices, and appear in search and cultivar discovery pages.",
    url: "/start-membership",
    siteName: METADATA_CONFIG.SITE_NAME,
    locale: METADATA_CONFIG.LOCALE,
    type: "website",
    images: [
      {
        url: IMAGES.DEFAULT_META,
        width: 1200,
        height: 630,
        alt: "Daylily seller catalog showcase",
      },
    ],
  },
  twitter: {
    card: METADATA_CONFIG.TWITTER_CARD_TYPE,
    title: `Create Your Daylily Catalog | ${METADATA_CONFIG.SITE_NAME}`,
    description:
      "Create a public daylily catalog and connect buyers to your listings.",
    site: METADATA_CONFIG.TWITTER_HANDLE,
    images: [IMAGES.DEFAULT_META],
  },
};

const SELLER_BENEFITS = [
  "Public seller profile and catalog page",
  "Listings with photos, pricing, and availability context",
  "Cultivar-linked listing data buyers can trust",
  "Searchable visibility in public catalog browsing",
  "Placement on cultivar pages and discovery surfaces",
  "Shareable custom catalog URL",
] as const;

interface HowStep {
  title: string;
  detail: string;
}

const HOW_IT_WORKS_STEPS = [
  {
    title: "Create your seller profile",
    detail: "Set your seller identity and contact paths.",
  },
  {
    title: "Add your first listing",
    detail: "Publish one photo-backed listing with cultivar linkage.",
  },
  {
    title: "Preview your catalog",
    detail: "See exactly what buyers will see before publishing.",
  },
  {
    title: `Start your ${SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day trial and publish`,
    detail: "Go live only when your catalog is ready.",
  },
] satisfies readonly HowStep[];

const FAQ_ITEMS = [
  {
    question: "How do buyers contact sellers?",
    answer:
      "Each public catalog and listing includes clear contact pathways so buyers can reach the seller directly.",
  },
  {
    question: "Are payments handled on-platform?",
    answer:
      "Buyer conversations and fulfillment are handled directly between buyer and seller.",
  },
  {
    question: "How does the trial work?",
    answer: `Start with a ${SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial. After trial, membership is $120/year ($10/month billed annually).`,
  },
  {
    question: "What happens before publishing?",
    answer:
      "You can build your profile and first listing, preview everything, and only publish when you are ready.",
  },
] as const;

export const dynamic = "force-static";
export const revalidate = false;

function createFaqSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    url: `${baseUrl}/start-membership`,
  };
}

function Section({
  id,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section id={id} className={cn("space-y-4 border-t pt-10", className)} {...props}>
      {children}
    </section>
  );
}

function SectionTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-3xl font-semibold tracking-tight", className)} {...props}>
      {children}
    </h2>
  );
}

interface ProFeatureItem {
  id: string;
  text: string;
  icon: ComponentType<{ className?: string }>;
}

function featureHeadlineText(featureText: string) {
  const [headline] = featureText.split(" - ");
  return headline ?? featureText;
}

export default async function StartMembershipPage() {
  const baseUrl = getBaseUrl();
  const faqSchema = createFaqSchema(baseUrl);

  return (
    <div className="min-h-svh bg-background">
      <SellerLandingViewTracker />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div
        className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 lg:space-y-14 lg:px-8 lg:py-12"
        data-testid="start-membership-page"
      >
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,540px)] lg:items-start lg:gap-10">
          <div className="space-y-7 py-1 lg:py-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
              <Sparkles className="h-4 w-4" />
              For daylily sellers
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl leading-[0.92] font-bold tracking-tight lg:text-7xl">
                <span className="block">Get found by daylily buyers.</span>
                <span className="block">Turn your catalog into a storefront.</span>
              </h1>

              <p className="text-muted-foreground max-w-xl text-2xl leading-tight lg:text-3xl">
                Publish a clean catalog under your seller name and appear in
                seller browsing, search, and cultivar pages where collectors
                research varieties.
              </p>
            </div>

            <div className="space-y-4">
              <SellerLandingAuthCta
                ctaId="seller-landing-hero-primary"
                ctaLabel="Create your catalog"
                className="h-12 w-full text-base font-semibold lg:w-auto lg:px-8"
                testId="start-membership-checkout"
              />

              <p className="text-muted-foreground text-sm">
                Start with a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free
                trial. Then $120/year ($10/month billed annually). Cancel
                anytime.
              </p>

              <SellerLandingExampleLink
                ctaId="seller-landing-hero-example"
                ctaLabel="See a live example"
                href="/rollingoaksdaylilies"
                className="text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center gap-1 text-xs underline underline-offset-2"
                testId="start-membership-continue"
              />
            </div>
          </div>

          <div className="bg-card rounded-[2rem] border p-6 shadow-sm lg:p-9">
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Pro plan
            </p>

            <p className="mt-4 flex items-end gap-1 leading-none">
              <span className="text-6xl font-bold tracking-tight lg:text-7xl">
                $120
              </span>
              <span className="text-4xl font-semibold tracking-tight lg:text-5xl">
                /yr
              </span>
            </p>

            <p className="text-muted-foreground mt-3 text-lg">
              $10/month billed annually via Stripe.
            </p>

            <ul className="mt-7 space-y-4 text-lg leading-tight lg:text-xl">
              {(PRO_FEATURES as readonly ProFeatureItem[]).map((feature) => {
                const Icon = feature.icon;

                return (
                  <li key={feature.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{featureHeadlineText(feature.text)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <Section>
          <SectionTitle>What members get</SectionTitle>
          <ul className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
            {SELLER_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="text-primary mt-1 h-4 w-4 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <SectionTitle>How it works</SectionTitle>
          <ol className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <div className="bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-muted-foreground text-sm">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section>
          <SectionTitle>Proof</SectionTitle>

          <div className="overflow-hidden rounded-2xl border">
            <div className="grid lg:grid-cols-2">
              <article className="space-y-3 p-5 lg:p-6">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl border">
                  <Image
                    src={IMAGES.DEFAULT_CATALOG}
                    alt="Example public catalog card"
                    fill
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="object-cover"
                  />
                </div>

                <p className="text-muted-foreground text-sm">Example catalog</p>
                <p className="text-xl font-semibold">Rolling Oaks Daylilies</p>
                <p className="text-muted-foreground text-sm">
                  Public profile with photos, location, and structured catalog
                  browsing.
                </p>
                <SellerLandingExampleLink
                  ctaId="seller-landing-proof-catalog-example"
                  ctaLabel="Explore Rolling Oaks catalog"
                  href="/rollingoaksdaylilies"
                  className="inline-flex items-center gap-1 text-sm font-medium underline"
                />
              </article>

              <article className="space-y-3 border-t p-5 lg:border-t-0 lg:border-l lg:p-6">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl border">
                  <Image
                    src={IMAGES.DEFAULT_LISTING}
                    alt="Example listing card"
                    fill
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="object-cover"
                  />
                </div>

                <p className="text-muted-foreground text-sm">Example listing</p>
                <p className="text-xl font-semibold">Starman spring fan</p>
                <p className="text-muted-foreground text-sm">
                  Listing with cultivar linkage, image, and pricing context.
                </p>
                <SellerLandingExampleLink
                  ctaId="seller-landing-proof-catalog-index"
                  ctaLabel="Browse all public catalogs"
                  href="/catalogs"
                  className="inline-flex items-center gap-1 text-sm font-medium underline"
                />
              </article>
            </div>
          </div>
        </Section>

        <Section id="pricing">
          <SectionTitle>Pricing and trial</SectionTitle>
          <div className="space-y-2">
            <p className="text-2xl font-semibold">
              Start with a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial.
            </p>
            <p className="text-muted-foreground">
              Then $120/year ($10/month billed annually). No login is required
              to view this page.
            </p>
          </div>
        </Section>

        <Section>
          <SectionTitle>FAQ</SectionTitle>
          <div className="divide-y rounded-2xl border">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group px-5 py-4" open={false}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold">
                  <span>{item.question}</span>
                  <Dot className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                </summary>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Section>

        <section className="space-y-4 border-t pt-10 text-center">
          <p className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight">
            Ready to list your daylilies where buyers already browse?
          </p>
          <div className="flex flex-col items-center gap-3">
            <SellerLandingAuthCta
              ctaId="seller-landing-final-primary"
              ctaLabel="Create your catalog"
              className="w-full lg:w-auto"
            />
            <SellerLandingExampleLink
              ctaId="seller-landing-final-example"
              ctaLabel="Browse active catalogs"
              href="/catalogs"
              className="text-muted-foreground inline-flex items-center gap-1 text-sm underline"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Your catalog can appear in public search, browsing, and cultivar
            discovery pages.
          </p>
        </section>

        <div className="text-muted-foreground inline-flex items-center justify-center gap-2 text-xs">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Public page → auth → existing onboarding → trial and publish
        </div>
      </div>
    </div>
  );
}
