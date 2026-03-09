"use client";

import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flower2, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H1, H2, H3, Muted, P } from "@/components/typography";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { UserCard } from "@/components/user-card";
import { HomeSearchPanel } from "./home-search-panel";
import { OptimizedImage } from "@/components/optimized-image";
import type { HomeFeaturedCultivar } from "@/types";
import type { PublicProfile } from "@/types/public-types";

interface HomePageClientProps {
  catalogs: PublicProfile[];
  featuredCultivars: HomeFeaturedCultivar[];
}

function SellerIntentButton({
  className,
  ctaId,
  entrySurface,
}: {
  className?: string;
  ctaId: string;
  entrySurface: string;
}) {
  const { isLoaded, userId } = useAuth();
  const text = "Create your catalog";

  const handleClick = () => {
    capturePosthogEvent("seller_cta_clicked", {
      entry_surface: entrySurface,
      source_page_type: "home",
      source_path: "/",
      cta_id: ctaId,
      cta_label: text,
      target_path: "/start-membership",
      is_authenticated: Boolean(userId),
    });

    capturePosthogEvent("home_signup_cta_clicked", {
      source: "home-page",
      auth_state: userId ? "signed_in" : "signed_out",
      entry_surface: entrySurface,
      target_path: "/start-membership",
    });
  };

  if (!isLoaded) {
    return (
      <Button size="lg" className={className} disabled>
        {text}
      </Button>
    );
  }

  return (
    <Button size="lg" className={className} asChild>
      <Link href="/start-membership" onClick={handleClick}>
        {text}
      </Link>
    </Button>
  );
}

function CultivarFeatureCard({
  cultivar,
  priority,
}: {
  cultivar: HomeFeaturedCultivar;
  priority: boolean;
}) {
  return (
    <Link
      href={`/cultivar/${cultivar.segment}`}
      className="group bg-card hover:border-primary overflow-hidden rounded-2xl border transition"
    >
      {cultivar.imageUrl ? (
        <OptimizedImage
          src={cultivar.imageUrl}
          alt={cultivar.name}
          size="full"
          priority={priority}
          className="aspect-[4/3]"
        />
      ) : (
        <div className="bg-muted aspect-[4/3]" />
      )}

      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <H3 className="text-xl leading-tight">{cultivar.name}</H3>
          {(cultivar.hybridizer ?? cultivar.year) && (
            <Muted className="text-sm">
              {[cultivar.hybridizer, cultivar.year].filter(Boolean).join(", ")}
            </Muted>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {cultivar.offerCount} public{" "}
            {cultivar.offerCount === 1 ? "offer" : "offers"}
          </Badge>
          <span className="text-sm font-medium">
            Open page
            <ArrowRight className="ml-1 inline h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePageClient({
  catalogs,
  featuredCultivars,
}: HomePageClientProps) {
  const featuredCatalogs = catalogs.slice(0, 6);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px]" />
          <Image
            src="/assets/hero-garden.webp"
            alt="Daylily garden at golden hour"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>

        <div className="relative z-20 mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-center lg:px-8 lg:py-16">
          <div className="space-y-6 text-white">
            <Badge className="bg-white/12 px-4 py-1.5 text-white backdrop-blur">
              Daylily database + catalog directory
            </Badge>

            <div className="space-y-4">
              <H1 className="text-5xl leading-[0.92] font-bold tracking-tight lg:text-7xl">
                Find cultivars. Find sellers.
              </H1>
              <P className="max-w-2xl text-xl text-white/80 lg:text-2xl">
                Browse public daylily catalogs, research cultivar pages, and
                keep a clear path open for sellers who are ready to publish.
              </P>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-white/80">
              <div className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                100,000+ registered cultivars
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                {catalogs.length} public catalogs
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                Buyer research and seller discovery
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/catalogs">
                  Browse catalogs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <SellerIntentButton
                className="w-full sm:w-auto"
                ctaId="home-hero-create-catalog"
                entrySurface="home_hero"
              />
            </div>

            <div className="grid gap-3 text-sm text-white/80 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Search className="mb-2 h-4 w-4" />
                Search cultivar pages with linked public offers.
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Store className="mb-2 h-4 w-4" />
                Browse catalogs by garden name, location, and description.
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Flower2 className="mb-2 h-4 w-4" />
                Start as a collector and become a seller when ready.
              </div>
            </div>
          </div>

          <HomeSearchPanel
            catalogs={catalogs}
            featuredCultivars={featuredCultivars}
          />
        </div>
      </section>

      <div className="bg-background">
        <section className="mx-auto max-w-6xl px-4 py-14 lg:px-8 lg:py-18">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <H2 className="text-3xl tracking-tight lg:text-4xl">
                Browse catalogs
              </H2>
              <P className="text-muted-foreground max-w-2xl text-lg">
                Start with live seller catalogs. These are the strongest public
                gardens on the site right now.
              </P>
            </div>

            <Button variant="outline" asChild>
              <Link href="/catalogs">Browse all catalogs</Link>
            </Button>
          </div>

          {featuredCatalogs.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {featuredCatalogs.map((catalog, index) => (
                <UserCard key={catalog.id} {...catalog} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border p-6">
              <P className="text-muted-foreground">
                Public catalogs will appear here as sellers publish them.
              </P>
            </div>
          )}
        </section>

        <section
          id="research-cultivars"
          className="mx-auto max-w-6xl px-4 py-14 lg:px-8 lg:py-18"
        >
          <div className="mb-8 space-y-3">
            <H2 className="text-3xl tracking-tight lg:text-4xl">
              Research cultivars
            </H2>
            <P className="text-muted-foreground max-w-2xl text-lg">
              Jump into cultivar pages that already have public offers attached.
            </P>
          </div>

          {featuredCultivars.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {featuredCultivars.map((cultivar, index) => (
                <CultivarFeatureCard
                  key={cultivar.id}
                  cultivar={cultivar}
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border p-6">
              <P className="text-muted-foreground">
                Cultivar spotlights will appear here once public listings are
                linked to database entries.
              </P>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 lg:px-8 lg:py-18">
          <div className="bg-card grid gap-6 overflow-hidden rounded-[2rem] border lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)]">
            <div className="space-y-5 p-6 lg:p-10">
              <Badge variant="secondary" className="w-fit">
                For sellers
              </Badge>
              <div className="space-y-3">
                <H2 className="text-3xl tracking-tight">
                  Publish a catalog when you are ready to sell.
                </H2>
                <P className="text-muted-foreground text-lg">
                  Home is now the broad front door. The seller close happens on
                  the dedicated membership page.
                </P>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  "Show up in catalog browsing, search, and cultivar pages.",
                  "Claim a custom catalog URL that is easy to share.",
                  "Keep adding listings, lists, and photos without inventory caps.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <SellerIntentButton
                  ctaId="home-seller-stripe-create-catalog"
                  entrySurface="home_seller_stripe"
                />
                <Button variant="outline" asChild>
                  <Link href="/start-membership">See seller details</Link>
                </Button>
              </div>
            </div>

            <div className="bg-muted/40 p-4 lg:p-6">
              <div className="bg-background overflow-hidden rounded-[1.5rem] border shadow-sm">
                <Image
                  src="/assets/catalog-blooms.webp"
                  alt="Seller catalog preview"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
