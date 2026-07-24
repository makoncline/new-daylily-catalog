// eslint-disable react/no-danger -- this page renders static JSON-LD.
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { LaurelRatingBadge } from "@/components/laurel-rating-badge";
import {
  MarketingHero,
  MarketingHeroContent,
} from "@/components/marketing-hero";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { buttonVariants } from "@/components/ui/button";
import { UsedByWave } from "@/components/used-by-wave";
import { METADATA_CONFIG } from "@/config/constants";
import { IMAGES } from "@/lib/constants/images";
import { cn } from "@/lib/utils";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { serializeJsonLd } from "@/lib/utils/json-ld";
import { buildPublicPageMetadata } from "../_seo/public-seo";

const PAGE_PATH = "/sell-daylilies-online";
const PAGE_TITLE = "Sell Daylilies Online With a Public Catalog";
const PAGE_DESCRIPTION =
  "Publish daylily listings with photos, prices, and availability. Buyers build a cart and send an inquiry while you control payment, shipping, pickup, and fulfillment.";
const BASE_URL = getCanonicalBaseUrl();

const HERO_POINTS = [
  "Listings with photos, prices, and availability",
  "A buyer cart that becomes one inquiry",
  "Your payment, shipping, and pickup process",
] as const;

const SELLING_STEPS = [
  {
    title: "Publish what is available",
    description:
      "Add photos, prices, availability, descriptions, and cultivar details to each listing.",
  },
  {
    title: "Share one catalog link",
    description:
      "Buyers browse your current listings instead of searching through old posts or message threads.",
  },
  {
    title: "Receive the buyer's selections",
    description:
      "The buyer sends their cart with a message. You reply directly and arrange payment, shipping, or pickup.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "How can I sell daylilies online?",
    answer:
      "Create a public catalog, publish the daylilies you have available, and share the catalog link. Buyers can select listings and send their cart to you with a message.",
  },
  {
    question: "Does Daylily Catalog collect buyer payments?",
    answer:
      "No. You arrange payment directly with each buyer using the method that works for your garden.",
  },
  {
    question: "Can buyers request more than one daylily?",
    answer:
      "Yes. Buyers can add multiple listings to their cart and send the full selection in one inquiry.",
  },
  {
    question: "Who handles shipping and pickup?",
    answer:
      "The grower does. You decide where you ship, when you ship, whether pickup is available, and how each order is fulfilled.",
  },
] as const;

const primaryCtaClassName = cn(
  buttonVariants({ variant: "gradient", size: "lg" }),
  "h-14 w-full rounded-xl bg-[#ef533f] px-8 text-base font-bold shadow-none hover:bg-[#d94734] lg:w-auto lg:min-w-[17rem]",
);
const secondaryCtaClassName = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  "h-14 w-full rounded-xl border-[#f4c477]/60 bg-transparent px-8 text-base font-bold text-[#f4c477] shadow-none hover:bg-[#f4c477] hover:text-[#07120e] lg:w-auto lg:min-w-[17rem]",
);

export const metadata = buildPublicPageMetadata({
  canonicalPath: PAGE_PATH,
  description: PAGE_DESCRIPTION,
  imageAlt: "A public daylily catalog for growers and buyers",
  imageUrl: IMAGES.DEFAULT_META,
  metadataBase: new URL(BASE_URL),
  pageUrl: `${BASE_URL}${PAGE_PATH}`,
  title: `${PAGE_TITLE} | ${METADATA_CONFIG.SITE_NAME}`,
});

function createPageJsonLd() {
  const pageUrl = `${BASE_URL}${PAGE_PATH}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: METADATA_CONFIG.SITE_NAME,
        url: BASE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: METADATA_CONFIG.SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: PAGE_DESCRIPTION,
      url: pageUrl,
      featureList: HERO_POINTS,
    },
    {
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
    },
  ];
}

export default function SellDayliliesOnlinePage() {
  return (
    <div className="bg-[#fbfaf4] text-[#142118]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(createPageJsonLd()),
        }}
      />

      <MarketingHero>
        <MarketingHeroContent className="grid items-start gap-8 lg:min-h-[25rem] lg:grid-cols-[minmax(0,1fr)_29rem] lg:items-center lg:gap-8">
          <div>
            <div className="mb-6 lg:mb-3">
              <LaurelRatingBadge />
            </div>
            <h1 className="max-w-4xl text-5xl leading-[0.95] font-semibold tracking-normal text-balance text-white lg:text-[4.8rem] lg:leading-[0.94]">
              <span className="block">Sell daylilies online.</span>
              <span className="block text-[#f4c477]">
                Keep every sale personal.
              </span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-xl leading-8 font-medium text-pretty text-[#dfe9dc] lg:mt-4 lg:text-lg lg:leading-7">
              Give buyers one catalog for your available daylilies. They send
              their cart to you, and you handle the sale your way.
            </p>
            <div className="mt-8 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:gap-5">
              <SellerIntentLink
                className={primaryCtaClassName}
                entrySurface="sell_daylilies_hero"
                ctaId="sell-daylilies-hero-create-catalog"
                ctaLabel="Create your catalog"
                sourcePageType="seo_landing"
              >
                Create your catalog
                <ArrowRight data-icon="inline-end" />
              </SellerIntentLink>
              <Link
                href="/rollingoaksdaylilies"
                className={secondaryCtaClassName}
              >
                See example catalog
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
          </div>

          <aside className="border-y border-white/28 py-6 text-white backdrop-blur-[2px] lg:border-y-0 lg:border-l lg:py-1 lg:pl-10">
            <p className="text-sm font-bold tracking-[0.18em] text-[#f4c477] uppercase">
              A direct selling workflow
            </p>
            <div className="mt-6 grid gap-5">
              {HERO_POINTS.map((point) => (
                <div
                  key={point}
                  className="grid grid-cols-[1.75rem_1fr] items-center gap-4"
                >
                  <CheckCircle2
                    className="size-5 text-[#f4c477]"
                    aria-hidden="true"
                  />
                  <p className="text-base leading-6 font-semibold text-white lg:text-lg">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </MarketingHeroContent>
        <UsedByWave />
      </MarketingHero>

      <section className="bg-black px-4 py-14 text-white lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-[1024px] gap-8 lg:grid-cols-[0.8fr_1fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold text-[#f4c477]">The short answer</p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold text-balance lg:text-5xl">
              You do not need to hand your whole sales process to a store.
            </h2>
          </div>
          <div className="flex flex-col gap-5 text-lg leading-8 text-[#d9e3d5]">
            <p>
              Daylily Catalog gives buyers a clear place to see what you have,
              compare listings, and send one organized inquiry.
            </p>
            <p>
              You still confirm availability and control payment, shipping,
              pickup, and fulfillment. The catalog supports the conversation; it
              does not replace it.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1024px]">
          <p className="text-sm font-bold text-[#a94e38]">How it works</p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold text-balance lg:text-5xl">
            Make it easy to browse. Keep the sale in your hands.
          </h2>
          <ol className="mt-10 grid border-y border-[#d8dfd2] lg:grid-cols-3">
            {SELLING_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="border-b border-[#d8dfd2] py-6 last:border-b-0 lg:border-r lg:border-b-0 lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-sm font-bold text-[#a94e38]">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#536357]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1024px]">
          <p className="text-sm font-bold text-[#a94e38]">Common questions</p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold lg:text-5xl">
            Selling daylilies online FAQ
          </h2>
          <div className="mt-8 border-b border-[#d8dfd2]">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group border-t border-[#d8dfd2] py-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-bold">
                  {item.question}
                  <span aria-hidden="true" className="text-[#a94e38]">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#536357]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-14 pb-24 lg:px-8 lg:pt-20 lg:pb-28">
        <div className="mx-auto grid max-w-[1024px] gap-8 border border-[#d8dfd2] bg-[#173126] p-7 text-white lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
          <div>
            <p className="text-sm font-bold text-[#f4c477]">For growers</p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold text-balance lg:text-5xl">
              Give buyers one current catalog for the daylilies you sell.
            </h2>
          </div>
          <SellerIntentLink
            className={primaryCtaClassName}
            entrySurface="sell_daylilies_final_cta"
            ctaId="sell-daylilies-final-create-catalog"
            ctaLabel="Create your catalog"
            sourcePageType="seo_landing"
          >
            Create your catalog
            <ArrowRight data-icon="inline-end" />
          </SellerIntentLink>
        </div>
      </section>
    </div>
  );
}
