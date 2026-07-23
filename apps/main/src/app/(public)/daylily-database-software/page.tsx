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

const PAGE_PATH = "/daylily-database-software";
const PAGE_TITLE = "Daylily Database Software for Growers";
const PAGE_DESCRIPTION =
  "Create a public daylily catalog with photos, prices, availability, notes, cultivar details, a buyer cart, and direct inquiries.";
const BASE_URL = getCanonicalBaseUrl();

const HERO_POINTS = [
  "One public link for your daylily catalog",
  "Photos, prices, availability, and notes",
  "Buyer cart and direct inquiries",
] as const;

const TOOL_OPTIONS = [
  {
    title: "Use a spreadsheet",
    description:
      "Best when your records are private and you do not need buyers to browse them.",
  },
  {
    title: "Use a general website builder",
    description:
      "Best when you need full design control and can maintain every listing and page yourself.",
  },
  {
    title: "Use Daylily Catalog",
    description:
      "Best when you want collection records, public listings, cultivar links, and buyer inquiries in one place.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "What is daylily database software?",
    answer:
      "Daylily database software helps a grower organize daylily records, photos, availability, prices, and cultivar details. Daylily Catalog also turns those records into a public catalog buyers can browse.",
  },
  {
    question: "Can I use Daylily Catalog to sell daylilies?",
    answer:
      "Yes. You can publish priced listings, let buyers add listings to a cart, and receive their selected items with a message.",
  },
  {
    question: "Does Daylily Catalog process payments or shipping?",
    answer:
      "No. The grower handles payment, pickup, shipping, and fulfillment directly with the buyer.",
  },
  {
    question: "Is Daylily Catalog better than a spreadsheet?",
    answer:
      "Use a spreadsheet for private records. Use Daylily Catalog when you also want a public catalog, shareable listings, cultivar links, and buyer inquiries.",
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
  imageAlt: "Daylily Catalog software for growers",
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

export default function DaylilyDatabaseSoftwarePage() {
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
              <span className="block">Daylily database software.</span>
              <span className="block text-[#f4c477]">
                Built for a real catalog.
              </span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-xl leading-8 font-medium text-pretty text-[#dfe9dc] lg:mt-4 lg:text-lg lg:leading-7">
              Turn your collection records into a public catalog with photos,
              prices, availability, notes, and direct buyer inquiries.
            </p>
            <div className="mt-8 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:gap-5">
              <SellerIntentLink
                className={primaryCtaClassName}
                entrySurface="database_software_hero"
                ctaId="database-software-hero-create-catalog"
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
              A practical daylily database
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
              Use it when your records should work for buyers, too.
            </h2>
          </div>
          <div className="flex flex-col gap-5 text-lg leading-8 text-[#d9e3d5]">
            <p>
              Daylily Catalog is web-based database software for growers and
              collectors who want more than a private collection log.
            </p>
            <p>
              Buyers can browse your public listings, add priced daylilies to a
              cart, and send their selected items with a message. You keep
              control of payment, pickup, shipping, and fulfillment.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1024px]">
          <p className="text-sm font-bold text-[#a94e38]">
            Choose the right tool
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold text-balance lg:text-5xl">
            The best software depends on what the catalog needs to do.
          </h2>
          <dl className="mt-10 grid gap-5 lg:grid-cols-3">
            {TOOL_OPTIONS.map((option) => (
              <div
                key={option.title}
                className="border border-[#d8dfd2] bg-white p-6"
              >
                <dt className="text-xl font-bold">{option.title}</dt>
                <dd className="mt-3 text-base leading-7 text-[#536357]">
                  {option.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1024px]">
          <p className="text-sm font-bold text-[#a94e38]">Common questions</p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold lg:text-5xl">
            Daylily database software FAQ
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
              Turn your collection into one catalog buyers can browse.
            </h2>
          </div>
          <SellerIntentLink
            className={primaryCtaClassName}
            entrySurface="database_software_final_cta"
            ctaId="database-software-final-create-catalog"
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
