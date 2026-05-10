// eslint-disable react/no-danger -- intentional static JSON-LD, style, or compatibility script injection.
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import {
  SellerLandingAuthCta,
  SellerLandingExampleLink,
  SellerLandingViewTracker,
} from "./_components/seller-landing-actions";
import { PRO_FEATURES, METADATA_CONFIG } from "@/config/constants";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { IMAGES } from "@/lib/constants/images";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { UsedByWave } from "@/components/used-by-wave";
import { LaurelRatingBadge } from "@/components/laurel-rating-badge";

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalBaseUrl()),
  title: `Create Your Daylily Catalog | ${METADATA_CONFIG.SITE_NAME}`,
  description:
    "Create a public catalog for your daylilies. Add photos, prices, availability, notes, and contact info.",
  alternates: {
    canonical: "/start-membership",
  },
  robots: "index, follow, max-image-preview:large",
  openGraph: {
    title: `Create Your Daylily Catalog | ${METADATA_CONFIG.SITE_NAME}`,
    description:
      "Create a public catalog for your daylilies. Buyers can browse your catalog and contact you directly.",
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
    description: "Create a public catalog for your daylilies.",
    site: METADATA_CONFIG.TWITTER_HANDLE,
    images: [IMAGES.DEFAULT_META],
  },
};

const SELLER_BENEFITS = [
  "Public catalog page",
  "Listings with photos, prices, and availability",
  "Grower notes and contact info",
  "Shareable catalog URL",
  "Public catalog browsing",
  "Cultivar-linked listings when available",
] as const;

const GROWER_TESTIMONIALS = [
  "Now I can send one catalog link instead of rebuilding my list in messages.",
  "Buyers can see photos, prices, availability, and notes before they contact me.",
  "I still handle each sale myself. The catalog just gives buyers a clear place to start.",
] as const;

const marketingButtonBase =
  "h-14 w-full rounded-xl px-8 text-base font-bold shadow-none lg:w-auto lg:min-w-[17rem]";
const marketingPrimaryButton = `${marketingButtonBase} bg-[#ef533f] text-white hover:bg-[#d94734]`;
const marketingSecondaryButton = `${marketingButtonBase} border border-[#f4c477]/60 bg-transparent text-[#f4c477] transition-colors hover:bg-[#f4c477] hover:text-[#07120e]`;
const marketingDarkSecondaryButton = `${marketingButtonBase} border border-white/35 bg-white/12 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-[#142118]`;

const HOW_IT_WORKS_STEPS = [
  {
    title: "Add your grower info",
    detail: "Name, location, photos, and contact info.",
  },
  {
    title: "Add your daylily listings",
    detail:
      "Photos, prices, availability, notes, and cultivar details when available.",
  },
  {
    title: "Preview your catalog",
    detail: "See what buyers will see before it goes public.",
  },
  {
    title: "Publish when ready",
    detail: "Start your trial when your catalog is ready to go live.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "How do buyers contact me?",
    answer: "Buyers use the contact info you add to your catalog.",
  },
  {
    question: "Does Daylily Catalog handle payments?",
    answer:
      "No. Daylily Catalog does not process buyer payments. You handle the sale directly.",
  },
  {
    question: "When does my free trial start?",
    answer:
      "The trial starts when you publish your catalog, not while you are building it.",
  },
  {
    question: "Can I build my catalog before publishing?",
    answer:
      "Yes. You can create your catalog and preview it before buyers can open it.",
  },
  {
    question: "What appears on cultivar pages?",
    answer:
      "If your listing is linked to a cultivar, it can appear on that cultivar's page so buyers can find it while researching.",
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

export default async function StartMembershipPage() {
  const baseUrl = getCanonicalBaseUrl();
  const faqSchema = createFaqSchema(baseUrl);

  return (
    <div className="min-h-svh overflow-hidden">
      <SellerLandingViewTracker />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <StartMembershipHero />

      <GrowerTestimonialsSection />

      <SellerBenefitsSection />

      <HowItWorksSection />

      <BuyerPreviewSection />

      <StartMembershipFaqSection />

      <StartMembershipFinalCta />
    </div>
  );
}

function StartMembershipHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#07120e] px-4 pt-24 pb-36 text-white lg:px-8 lg:pt-20 lg:pb-32">
      <div className="absolute inset-0 -z-10 bg-[#07120e]" aria-hidden="true">
        <Image
          src="/assets/home-redesign/daylily-hero-grid.webp"
          alt=""
          fill
          priority
          sizes="140vw"
          className="hero-grid-pan size-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.72)_38%,rgba(7,18,14,0.2)_72%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),radial-gradient(circle_at_100%_100%,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.62)_42%,rgba(7,18,14,0.12)_72%,rgba(7,18,14,0)_100%)]" />
      </div>

      <div
        className="mx-auto grid max-w-[1024px] items-start gap-7 lg:min-h-[25rem] lg:grid-cols-[minmax(0,1fr)_31.5rem] lg:items-center lg:gap-8"
        data-testid="start-membership-page"
      >
        <div>
          <div className="mb-6 lg:mb-3">
            <LaurelRatingBadge />
          </div>

          <h1 className="max-w-4xl text-5xl leading-[0.95] font-semibold tracking-normal text-balance text-white lg:text-[4.8rem] lg:leading-[0.94]">
            <span className="block">Your whole daylily catalog.</span>
            <span className="block text-[#f4c477]">
              One link buyers can browse.
            </span>
          </h1>

          <p className="mt-6 max-w-[34rem] text-xl leading-8 font-medium text-pretty text-[#dfe9dc] lg:mt-4 lg:text-lg lg:leading-7">
            Add photos, prices, availability, notes, and contact info. Build and
            preview for free. Start a {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day
            trial when you publish, then $120/year.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:gap-5">
            <SellerLandingAuthCta
              ctaId="seller-landing-hero-primary"
              ctaLabel="Create your catalog"
              className={marketingPrimaryButton}
              testId="start-membership-checkout"
            />

            <SellerLandingExampleLink
              ctaId="seller-landing-hero-example"
              ctaLabel="See example catalog"
              href="/rollingoaksdaylilies"
              className={`inline-flex items-center justify-center ${marketingSecondaryButton}`}
              testId="start-membership-continue"
            >
              See example catalog
              <ArrowRight className="ml-4 size-5" />
            </SellerLandingExampleLink>
          </div>
        </div>

        <div
          id="pricing"
          className="border-y border-white/28 py-6 text-white backdrop-blur-[2px] lg:border-y-0 lg:border-l lg:py-1 lg:pl-10"
        >
          <p className="text-sm font-bold tracking-[0.18em] text-[#f4c477] uppercase">
            Grower membership
          </p>
          <p className="mt-4 flex items-end gap-1 leading-none">
            <span className="text-6xl font-bold tracking-tight text-white">
              $120
            </span>
            <span className="text-4xl font-semibold tracking-tight text-white">
              /year
            </span>
          </p>
          <p className="mt-3 max-w-lg text-lg leading-7 text-[#dfe9dc]">
            Build for free. Start your {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}
            -day trial when you publish.
          </p>

          <div className="mt-6 grid gap-4 border-t border-white/22 pt-5">
            {PRO_FEATURES.slice(0, 3).map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.id}
                  className="grid grid-cols-[1.75rem_1fr] items-center gap-4"
                >
                  <span className="flex size-7 items-center justify-center text-[#f4c477]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-base leading-6 font-semibold text-white lg:text-lg">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UsedByWave />

      <style>{`
        @keyframes hero-grid-pan {
          0%,
          100% {
            transform: scale(1.38) translate3d(8%, 0, 0);
          }
          50% {
            transform: scale(1.38) translate3d(-8%, 0, 0);
          }
        }

        .hero-grid-pan {
          animation: hero-grid-pan 82s ease-in-out infinite;
          animation-delay: -18s;
          transform-origin: center;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-grid-pan {
            animation: none;
            transform: scale(1.38);
          }
        }

        @media (max-width: 1023px) {
          @keyframes hero-grid-pan {
            0%,
            100% {
              transform: scale(1.95) translate3d(8%, 0, 0);
            }
            50% {
              transform: scale(1.95) translate3d(-8%, 0, 0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-grid-pan {
              transform: scale(1.95);
            }
          }
        }
      `}</style>
    </section>
  );
}

function GrowerTestimonialsSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#07120e] px-4 pt-12 pb-12 text-white lg:px-8 lg:pt-14 lg:pb-16">
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden="true">
        <div className="grid size-full grid-cols-3 gap-2 lg:grid-cols-6">
          {[
            "/assets/home-redesign/listing-workspace.webp",
            "/assets/home-redesign/collection-planning.webp",
            "/assets/home-redesign/cultivar-research-card.webp",
            "/assets/home-redesign/cultivar-listings-card.webp",
            "/assets/home-redesign/grower-garden.webp",
            "/assets/home-redesign/open-garden-path.webp",
          ].map((src) => (
            <div key={src} className="relative min-h-48">
              <Image
                src={src}
                alt=""
                fill
                sizes="20vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[#07120e]/84" />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-16 bg-linear-to-b from-black via-black/75 to-transparent lg:h-20"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1024px]">
        <div className="grid gap-7 lg:grid-cols-3 lg:gap-10">
          {GROWER_TESTIMONIALS.map((quote, quoteIndex) => (
            <figure
              key={quote}
              className={[
                "flex min-h-[15rem] items-center justify-center rounded-3xl border-4 border-[#ef533f] bg-white p-7 text-center text-[#07120e] shadow-[0_30px_90px_-58px_rgba(0,0,0,0.95)] lg:min-h-[18rem] lg:p-8 lg:will-change-transform lg:[backface-visibility:hidden] lg:[transform-style:preserve-3d]",
                quoteIndex === 0
                  ? "lg:[transform-origin:left_center] lg:[transform:perspective(620px)_rotateY(10deg)_rotateZ(-0.18deg)]"
                  : "",
                quoteIndex === 2
                  ? "lg:[transform-origin:right_center] lg:[transform:perspective(620px)_rotateY(-10deg)_rotateZ(0.18deg)]"
                  : "",
              ].join(" ")}
            >
              <blockquote className="text-2xl leading-10 font-bold tracking-tight text-balance lg:text-[1.7rem] lg:leading-[2.65rem]">
                &quot;{quote}&quot;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function SellerBenefitsSection() {
  return (
    <section className="bg-[#fbfaf4] px-4 py-12 text-[#142118] lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-[1024px] gap-8 lg:grid-cols-[0.48fr_1fr] lg:gap-14">
        <div className="lg:max-w-[31rem]">
          <p className="text-sm font-bold text-[#a94e38]">What you get</p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-normal text-balance lg:text-5xl lg:leading-[1.04]">
            Show buyers what you have before they ask.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#536357]">
            Put your daylily listings, photos, prices, availability, notes, and
            contact info in one public catalog.
          </p>
        </div>

        <ul className="grid border-t border-[#d8dfd2] lg:grid-cols-2">
          {SELLER_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex min-h-24 items-start gap-4 border-b border-[#d8dfd2] py-5 lg:pr-8 lg:odd:border-r lg:odd:border-[#d8dfd2] lg:even:pl-8"
            >
              <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#a94e38]" />
              <p className="text-lg leading-7 font-semibold">{benefit}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-[#173126] px-4 py-14 text-[#f7faf2] lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-[1024px]">
        <p className="text-sm font-bold text-[#f4c477]">How it works</p>
        <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-balance lg:text-6xl">
          Build first. Publish when ready.
        </h2>

        <ol className="mt-10 grid list-none border-y border-white/20 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[3rem_1fr] gap-4 border-b border-white/20 py-6 last:border-b-0 lg:border-r lg:border-b-0 lg:px-6 lg:first:pl-0 lg:last:border-r-0"
            >
              <div
                className="flex size-12 items-center justify-center bg-[#f4c477] text-base font-bold text-[#07120e]"
                aria-hidden="true"
              >
                {index + 1}
              </div>
              <div>
                <p className="text-xl leading-7 font-semibold">{step.title}</p>
                <p className="mt-3 text-sm leading-6 text-[#c8d3c4]">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <SellerLandingAuthCta
            ctaId="seller-landing-process-primary"
            ctaLabel="Create your catalog"
            className={marketingPrimaryButton}
          />
        </div>
      </div>
    </section>
  );
}

function BuyerPreviewSection() {
  return (
    <section className="bg-[#fbfaf4] px-4 py-12 text-[#142118] lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1024px]">
        <div className="grid gap-6 border-b border-[#d8dfd2] pb-8 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-bold text-[#a94e38]">What buyers see</p>
            <h2 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold tracking-normal text-balance lg:text-6xl">
              See what buyers will see.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[#536357]">
            Your catalog can show buyers your profile, listings, photos, prices,
            availability, notes, and contact info.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="group overflow-hidden rounded-3xl border border-[#dbe3d5] bg-white shadow-[0_24px_80px_-64px_rgba(24,50,32,0.8)]">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src="/assets/home-redesign/garden-path-proof.webp"
                alt="Example public catalog card"
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>

            <div className="p-6 lg:p-8">
              <p className="text-sm font-bold text-[#a94e38]">
                Example catalog
              </p>
              <p className="mt-3 text-3xl font-semibold">
                Rolling Oaks Daylilies
              </p>
              <p className="mt-3 text-base leading-7 text-[#536357]">
                See a public grower profile, catalog page, and listings.
              </p>

              <SellerLandingExampleLink
                ctaId="seller-landing-proof-catalog-example"
                ctaLabel="View example catalog"
                href="/rollingoaksdaylilies"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#142118] underline-offset-4 hover:underline"
              >
                View example catalog
                <ArrowRight className="size-4" />
              </SellerLandingExampleLink>
            </div>
          </article>

          <article className="group overflow-hidden rounded-3xl border border-[#dbe3d5] bg-white shadow-[0_24px_80px_-64px_rgba(24,50,32,0.8)]">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src="/assets/home-redesign/listing-workspace.webp"
                alt="Daylily blooms and grower notes on a work table"
                fill
                loading="eager"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>

            <div className="p-6 lg:p-8">
              <p className="text-sm font-bold text-[#a94e38]">
                Example listing
              </p>
              <p className="mt-3 text-3xl font-semibold">Starman Spring Fan</p>
              <p className="mt-3 text-base leading-7 text-[#536357]">
                See how a listing can show photos, notes, price, availability,
                and cultivar details.
              </p>

              <SellerLandingExampleLink
                ctaId="seller-landing-proof-catalog-index"
                ctaLabel="View example listing"
                href="/starcrossedseeds?viewing=6168"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#142118] underline-offset-4 hover:underline"
              >
                View example listing
                <ArrowRight className="size-4" />
              </SellerLandingExampleLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function StartMembershipFaqSection() {
  return (
    <section className="bg-[#fbfaf4] px-4 pb-14 text-[#142118] lg:px-8 lg:pb-20">
      <div className="mx-auto max-w-[1024px]">
        <h2 className="text-4xl font-semibold tracking-normal">FAQ</h2>

        <div className="mt-6 divide-y divide-[#d8dfd2] border-y border-[#d8dfd2]">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group py-5"
              open={item.question === "Does Daylily Catalog handle payments?"}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-xl font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown className="mt-0.5 size-5 shrink-0 text-[#536357] transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <p className="mt-3 max-w-3xl text-base leading-7 text-[#536357]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function StartMembershipFinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#07120e] px-4 py-16 text-white lg:px-8 lg:py-24">
      <div className="absolute inset-0">
        <Image
          src="/assets/home-redesign/open-garden-path.webp"
          alt="Daylily garden at sunset"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-[#07120e]/58 lg:bg-[#07120e]/72" />
      </div>

      <div className="relative z-20 mx-auto max-w-[1024px]">
        <p className="max-w-4xl text-5xl leading-[0.96] font-semibold tracking-normal text-balance lg:text-8xl">
          Ready to create your daylily catalog?
        </p>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#dfe9dc]">
          Build your catalog for free, preview it, and publish when you are
          ready.
        </p>

        <div className="mt-9 flex flex-col gap-3 lg:flex-row">
          <SellerLandingAuthCta
            ctaId="seller-landing-final-primary"
            ctaLabel="Create your catalog"
            className={marketingPrimaryButton}
          />

          <SellerLandingExampleLink
            ctaId="seller-landing-final-example"
            ctaLabel="See example catalog"
            href="/rollingoaksdaylilies"
            className={`inline-flex items-center justify-center ${marketingDarkSecondaryButton}`}
          >
            See example catalog
          </SellerLandingExampleLink>
        </div>
      </div>
    </section>
  );
}
