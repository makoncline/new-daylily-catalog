"use client";

// eslint-disable react/no-unknown-property -- Next styled-jsx uses the jsx/global attributes on <style>.

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { H1, H2, P } from "@/components/typography";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import {
  OptimizedImage,
  type OptimizedImageSource,
} from "@/components/optimized-image";
import { UsedByWave } from "@/components/used-by-wave";
import { LaurelRatingBadge } from "@/components/laurel-rating-badge";

export interface HomePageCatalog {
  description: string | null;
  id: string;
  images: OptimizedImageSource[];
  listingCount: number;
  location: string | null;
  slug: string | null;
  title: string | null;
}

const marketingButtonBase =
  "h-14 w-full rounded-xl px-8 text-base font-bold shadow-none lg:w-auto lg:min-w-[17rem]";
const marketingPrimaryButton = `${marketingButtonBase} bg-[#ef533f] text-white hover:bg-[#d94734]`;
const marketingSecondaryButton = `${marketingButtonBase} border border-[#f4c477]/60 bg-transparent text-[#f4c477] hover:bg-[#f4c477] hover:text-[#07120e]`;
const START_MEMBERSHIP_PATH = "/start-membership";

function SellerIntentButton({
  className,
  ctaId,
  entrySurface,
  showArrow = false,
  text = "Create your catalog",
}: {
  className?: string;
  ctaId: string;
  entrySurface: string;
  showArrow?: boolean;
  text?: string;
}) {
  const trackHomeSignupClick = () => {
    capturePosthogEvent("seller_cta_clicked", {
      entry_surface: entrySurface,
      source_page_type: "home",
      source_path: "/",
      cta_id: ctaId,
      cta_label: text,
      target_path: START_MEMBERSHIP_PATH,
    });

    capturePosthogEvent("home_signup_cta_clicked", {
      source: "home-page",
      entry_surface: entrySurface,
      target_path: START_MEMBERSHIP_PATH,
    });
  };

  return (
    <Button size="lg" variant="gradient" className={className} asChild>
      <Link href={START_MEMBERSHIP_PATH} onClick={trackHomeSignupClick}>
        {text}
        {showArrow ? <ArrowRight className="ml-3 size-5" /> : null}
      </Link>
    </Button>
  );
}

const conceptCards = [
  {
    title: "Photos and details",
    body: "See photos and listing notes from growers.",
    image: "/assets/home-redesign/listing-workspace.webp",
    alt: "Daylily blooms arranged on a grower's work table",
  },
  {
    title: "Prices and availability",
    body: "Check prices and availability when growers include them.",
    image: "/assets/home-redesign/collection-planning.webp",
    alt: "Printed daylily photos and garden planning materials",
  },
  {
    title: "Direct contact",
    body: "Ask the grower about buying, pickup, or shipping.",
    image: "/assets/home-redesign/grower-garden.webp",
    alt: "Daylily garden path with mature planting beds",
  },
] as const;

const discoverySteps = [
  {
    title: "Research the cultivar",
    body: "Review photos and details when available.",
    image: "/assets/home-redesign/cultivar-research-card.webp",
    alt: "Daylily blooms with research notebook and reference cards",
  },
  {
    title: "Find listings",
    body: "See listings growers have linked to that cultivar.",
    image: "/assets/home-redesign/cultivar-listings-card.webp",
    alt: "Printed daylily listing photo grid",
  },
  {
    title: "Contact the grower",
    body: "Ask about buying, pickup, or shipping.",
    image: "/assets/home-redesign/cultivar-contact-card.webp",
    alt: "Phone and note card on a table in a daylily garden",
  },
] as const;

const buyerTestimonials = [
  "The catalog answers my first question: what is actually available?",
  "I can compare listings without digging through old posts or message threads.",
  "When I find something I like, I can ask the grower about buying, pickup, or shipping.",
] as const;

function NomadsCatalogCard({
  catalog,
  hasBadge = false,
  priority = false,
}: {
  catalog: HomePageCatalog;
  hasBadge?: boolean;
  priority?: boolean;
}) {
  const gardenName = catalog.title ?? "Unnamed garden";
  const visiblePath = `/${catalog.slug ?? catalog.id}`;
  const image = catalog.images[0];
  const titleFontSizeRem = Math.max(
    0.72,
    Math.min(2.05, 15.5 / Math.max(gardenName.length * 0.52, 1)),
  );

  return (
    <div className="relative">
      {hasBadge ? (
        <div className="absolute -top-4 -left-3 z-20 rounded-xl border border-[#d6ded3] bg-white px-4 py-2 text-lg font-bold text-[#142118] shadow-[0_10px_28px_-22px_rgba(20,33,24,0.8)]">
          Featured
        </div>
      ) : null}

      <Link
        href={visiblePath}
        className="group relative isolate flex min-h-[18rem] min-w-[18rem] overflow-hidden rounded-3xl border border-[#dbe3d5] bg-[#173126] text-white shadow-[0_24px_80px_-58px_rgba(24,50,32,0.9)] transition-transform duration-300 hover:-translate-y-1"
      >
        {image?.url ? (
          <OptimizedImage
            image={image}
            alt={`${gardenName} catalog image`}
            size="full"
            priority={priority}
            className="absolute inset-0 aspect-auto size-full transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#6b8f63,#173126_62%)]" />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-[#07120e]/95 via-[#07120e]/58 to-[#07120e]/18" />

        <div className="relative z-10 flex min-h-[18rem] w-full flex-col p-5">
          <div className="flex flex-1 items-center">
            <div className="w-full">
              <div className="flex h-11 items-center">
                <h3
                  className="max-w-full overflow-hidden leading-none font-semibold whitespace-nowrap text-white drop-shadow-lg"
                  style={{ fontSize: `${titleFontSizeRem}rem` }}
                  title={gardenName}
                >
                  {gardenName}
                </h3>
              </div>

              <p
                className={cn(
                  "mt-2 min-h-5 text-sm font-semibold text-white/86 drop-shadow",
                  !catalog.location && "invisible",
                )}
              >
                {catalog.location ?? "Location"}
              </p>

              <p
                className={cn(
                  "mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-white/84",
                  !catalog.description && "invisible",
                )}
              >
                {catalog.description ?? "Catalog description"}
              </p>
            </div>
          </div>

          <div className="flex h-11 items-center justify-between gap-4 text-sm font-bold text-white">
            <span className="shrink-0">{catalog.listingCount} listings</span>
            <span className="inline-flex min-w-[8.25rem] shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 whitespace-nowrap text-[#173126]">
              Open catalog
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function LandingVariantTwoWithCatalogs({
  catalogs,
}: {
  catalogs: readonly HomePageCatalog[];
}) {
  const featuredCatalogs = catalogs
    .filter((catalog) => catalog.title?.toLowerCase() !== "example")
    .slice(0, 6);

  return (
    <div className="mx-auto overflow-hidden bg-[#07120e] text-white">
      <HomeHeroSection />

      <BuyerTestimonialsSection />

      <FeaturedCatalogsSection featuredCatalogs={featuredCatalogs} />

      <CultivarDiscoverySection />
    </div>
  );
}

const EMPTY_CATALOGS: readonly HomePageCatalog[] = [];

export default function HomePageClient({
  catalogs = EMPTY_CATALOGS,
}: {
  catalogs?: readonly HomePageCatalog[];
}) {
  return <LandingVariantTwoWithCatalogs catalogs={catalogs} />;
}

function HomeHeroSection() {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-24 pb-36 lg:px-8 lg:pt-24 lg:pb-32">
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

      <div className="mx-auto grid max-w-[1024px] items-start gap-8 lg:min-h-[25rem] lg:grid-cols-[minmax(0,1fr)_29rem] lg:items-center lg:gap-8">
        <div>
          <div className="mb-4 -ml-3 lg:mb-2 lg:-ml-4">
            <LaurelRatingBadge />
          </div>
          <H1 className="max-w-4xl text-6xl leading-[0.93] tracking-normal text-balance text-white lg:text-[4.8rem] lg:leading-[0.94]">
            <span className="block">The daylily you want.</span>
            <span className="block text-[#f4c477]">
              From the grower who has it.
            </span>
          </H1>
          <P className="mt-7 max-w-[28rem] text-2xl leading-10 font-medium text-pretty text-[#dfe9dc] lg:mt-4 lg:text-lg lg:leading-7">
            Browse grower catalogs with photos, prices, availability, notes, and
            contact info. Details vary by catalog.
          </P>

          <div className="mt-8 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:items-center">
            <Button
              size="lg"
              variant="gradient"
              className={marketingPrimaryButton}
              asChild
            >
              <Link href="/catalogs">
                Browse catalogs
                <ArrowRight className="ml-4 size-5" />
              </Link>
            </Button>
            <SellerIntentButton
              text="Create your catalog"
              showArrow
              className={marketingSecondaryButton}
              ctaId="home_variant_zero_create_catalog"
              entrySurface="home_variant_zero"
            />
          </div>
        </div>

        <aside className="mt-8 border-y border-white/22 py-2 backdrop-blur-[2px] lg:mt-0">
          <div className="divide-y divide-white/16">
            {conceptCards.map((card) => (
              <Link
                key={card.title}
                href="/catalogs"
                className="grid grid-cols-[7rem_1fr] gap-4 py-4 transition-colors hover:bg-white/[0.04] lg:grid-cols-[8rem_1fr]"
              >
                <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(min-width: 1024px) 160px, 112px"
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                  <div>
                    <h2 className="text-lg leading-6 font-semibold text-white">
                      {card.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-5 text-[#c8d3c4]">
                      {card.body}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-white/65 lg:h-5 lg:w-5" />
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/catalogs"
            className="mt-4 flex h-10 items-center justify-start text-base font-bold text-[#f4c477] hover:underline lg:justify-center"
          >
            Browse catalogs
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </aside>
      </div>

      <UsedByWave />

      <style jsx global>{`
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

function BuyerTestimonialsSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#07120e] px-4 pt-12 pb-10 text-white lg:px-8 lg:pt-14 lg:pb-14">
      <div className="absolute inset-0 -z-10 opacity-42" aria-hidden="true">
        <div className="grid size-full grid-cols-3 gap-2 lg:grid-cols-6">
          {[
            "/assets/home-redesign/cultivar-research-card.webp",
            "/assets/home-redesign/cultivar-listings-card.webp",
            "/assets/home-redesign/cultivar-contact-card.webp",
            "/assets/home-redesign/listing-workspace.webp",
            "/assets/home-redesign/collection-planning.webp",
            "/assets/home-redesign/garden-path-proof.webp",
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
        <div className="absolute inset-0 bg-[#07120e]/82" />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-16 bg-linear-to-b from-black via-black/75 to-transparent lg:h-20"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1024px]">
        <div className="grid gap-7 lg:grid-cols-3 lg:gap-10">
          {buyerTestimonials.map((quote, quoteIndex) => (
            <figure
              key={quote}
              className={cn(
                "flex min-h-[15rem] items-center justify-center rounded-3xl border-4 border-[#ef533f] bg-white p-7 text-center text-[#07120e] shadow-[0_30px_90px_-58px_rgba(0,0,0,0.95)] lg:min-h-[18rem] lg:p-8 lg:will-change-transform lg:[backface-visibility:hidden] lg:[transform-style:preserve-3d]",
                quoteIndex === 0 &&
                  "lg:[transform-origin:left_center] lg:[transform:perspective(620px)_rotateY(10deg)_rotateZ(-0.18deg)]",
                quoteIndex === 2 &&
                  "lg:[transform-origin:right_center] lg:[transform:perspective(620px)_rotateY(-10deg)_rotateZ(0.18deg)]",
              )}
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

function FeaturedCatalogsSection({
  featuredCatalogs,
}: {
  featuredCatalogs: readonly HomePageCatalog[];
}) {
  return (
    <section
      id="home-catalogs"
      className="bg-[#fbfaf4] px-4 py-12 text-[#142118] lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-[1024px]">
        <div className="grid gap-5 border-b border-[#d8dfd2] pb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.55fr)] lg:items-start lg:gap-10">
          <div>
            <p className="text-sm font-bold text-[#a94e38]">
              Active grower catalogs
            </p>
            <H2 className="mt-4 max-w-3xl pb-0 text-4xl leading-tight tracking-normal text-balance lg:text-5xl lg:leading-[1.04]">
              Open a catalog to see what is available.
            </H2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-pretty text-[#536357] lg:pt-10">
            Each grower chooses what to show, including photos, prices,
            availability, notes, and contact info.
          </p>
        </div>

        {featuredCatalogs.length > 0 ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
            {featuredCatalogs.map((catalog, index) => (
              <NomadsCatalogCard
                key={catalog.id}
                catalog={catalog}
                hasBadge={index === 0}
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-[#dbe3d5] bg-white p-8 text-[#536357]">
            Public catalog cards will appear here when catalogs are available.
          </div>
        )}

        <div className="mt-10 grid gap-8 border border-[#264235] bg-[#173126] p-6 text-white shadow-[0_28px_90px_-64px_rgba(24,50,32,0.9)] lg:grid-cols-[1fr_0.72fr] lg:p-8">
          <div>
            <p className="text-sm font-bold text-[#f4c477]">For growers</p>
            <h2 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold text-balance lg:text-5xl">
              Create a daylily catalog buyers can browse.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#d9e3d5]">
              Add photos, prices, availability, notes, and contact info in one
              public place. Buyers can contact you directly.
            </p>
          </div>

          <div className="flex flex-col justify-end gap-4 lg:items-end">
            <SellerIntentButton
              text="Create your catalog"
              showArrow
              className={marketingPrimaryButton}
              ctaId="home_grower_panel_create_catalog"
              entrySurface="home_grower_panel"
            />
            <Link
              href="/rollingoaksdaylilies"
              className={`inline-flex items-center justify-center transition-colors ${marketingSecondaryButton}`}
            >
              See example catalog
              <ArrowRight className="ml-3 size-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CultivarDiscoverySection() {
  return (
    <section className="bg-[#f1f4ec] px-4 py-12 text-[#142118] lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-[1024px] gap-10 lg:grid-cols-[0.72fr_1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold text-[#a94e38]">Cultivar pages</p>
          <H2 className="mt-4 max-w-3xl pb-0 text-4xl leading-tight tracking-normal text-balance lg:text-6xl">
            Research a cultivar, then see listings.
          </H2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#536357]">
            If a grower links a listing to a cultivar, buyers can find it on
            that cultivar&apos;s page.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="mt-8 h-14 border-[#173126] bg-transparent px-7 text-base font-bold text-[#173126] hover:bg-[#173126] hover:text-white"
            asChild
          >
            <Link href="/cultivar/coffee-frenzy">
              See an example cultivar page
              <ArrowRight className="ml-3 size-5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {discoverySteps.map((step) => (
            <div
              key={step.title}
              className="overflow-hidden border border-[#d1dbc9] bg-[#fbfaf4] shadow-[0_18px_54px_-48px_rgba(24,50,32,0.75)]"
            >
              <div className="relative aspect-[16/9] border-b border-[#d1dbc9] lg:aspect-[4/3]">
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 260px, 100vw"
                  loading="eager"
                  className="object-cover"
                />
              </div>

              <div className="p-5 lg:p-6">
                <h3 className="text-2xl leading-8 font-semibold">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[#536357]">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
