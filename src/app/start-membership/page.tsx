import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
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
    <div className="min-h-svh">
      <SellerLandingViewTracker />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[80svh] items-center py-12 lg:py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10 bg-black/55 backdrop-blur-[2px]" />
          <Image
            src={IMAGES.DEFAULT_META}
            alt="Daylily garden"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>

        <div
          className="relative z-20 mx-auto grid w-full max-w-6xl gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,540px)] lg:items-start lg:gap-10 lg:px-8"
          data-testid="start-membership-page"
        >
          <div className="space-y-7 py-1 text-white lg:py-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium tracking-wide uppercase backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              For daylily sellers
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl leading-[0.92] font-bold tracking-tight lg:text-7xl">
                <span className="block">Get found by daylily buyers.</span>
                <span className="block">
                  Turn your catalog into a storefront.
                </span>
              </h1>

              <p className="max-w-xl text-2xl leading-tight text-white/80 lg:text-3xl">
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

              <p className="text-sm text-white/70">
                Start with a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free
                trial. Then $120/year ($10/month billed annually). Cancel
                anytime.
              </p>

              <SellerLandingExampleLink
                ctaId="seller-landing-hero-example"
                ctaLabel="See a live example"
                href="/rollingoaksdaylilies"
                className="inline-flex items-center gap-1 text-xs text-white/50 underline underline-offset-2 transition-colors hover:text-white/80"
                testId="start-membership-continue"
              />
            </div>
          </div>

          <div
            id="pricing"
            className="bg-card rounded-[2rem] border p-6 shadow-2xl lg:p-9"
          >
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
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{featureHeadlineText(feature.text)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── What members get ─────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">
            What members get
          </h2>

          <ul className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
            {SELLER_BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 leading-relaxed"
              >
                <CheckCircle2 className="text-primary mt-1 h-4 w-4 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="bg-muted/50 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">
            How it works
          </h2>

          <ol className="grid gap-8 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 lg:flex-col">
                <div className="bg-foreground text-background flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </div>

                <div className="space-y-1">
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Proof ────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">Proof</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="group overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={IMAGES.DEFAULT_CATALOG}
                  alt="Example public catalog card"
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>

              <div className="space-y-2 p-5 lg:p-6">
                <p className="text-muted-foreground text-sm">
                  Example catalog
                </p>
                <p className="text-xl font-semibold">
                  Rolling Oaks Daylilies
                </p>
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
              </div>
            </article>

            <article className="group overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={IMAGES.DEFAULT_LISTING}
                  alt="Example listing card"
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>

              <div className="space-y-2 p-5 lg:p-6">
                <p className="text-muted-foreground text-sm">
                  Example listing
                </p>
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
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="bg-muted/50 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-6 px-4 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>

          <div className="bg-card divide-y rounded-2xl border shadow-sm">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group px-5 py-4"
                open={false}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <ChevronDown className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>

                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10 bg-black/55" />
          <Image
            src="/assets/cta-garden.webp"
            alt="Daylily garden at sunset"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="relative z-20 mx-auto max-w-3xl space-y-6 px-4 text-center text-white">
          <p className="text-3xl font-semibold tracking-tight lg:text-4xl">
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
              className="inline-flex items-center gap-1 text-sm text-white/70 underline transition-colors hover:text-white"
            />
          </div>

          <p className="text-sm text-white/70">
            Your catalog can appear in public search, browsing, and cultivar
            discovery pages.
          </p>
        </div>
      </section>

      {/* ── Footer note ──────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Public page → auth → existing onboarding → trial and publish
        </div>
      </div>
    </div>
  );
}
