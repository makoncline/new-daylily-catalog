"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  FileSpreadsheet,
  ImageIcon,
  Link2,
  MessageCircle,
  Search,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { OptimizedImage } from "@/components/optimized-image";
import { PublicCatalogSearchContent } from "@/components/public-catalog-search/public-catalog-search-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import type { RouterOutputs } from "@/trpc/react";
import type { AnonymousOnboardingCollectionItem } from "./anonymous-onboarding-draft";
import type { AnonymousOnboardingController } from "./use-anonymous-onboarding-controller";

type CultivarSearchProps = Pick<
  AnonymousOnboardingController,
  | "addCultivarToCollection"
  | "cultivarQuery"
  | "cultivarSearchError"
  | "cultivarSearchIsLoading"
  | "cultivarSearchResults"
  | "draft"
  | "removeCultivarFromCollection"
  | "setCultivarQuery"
>;

function CultivarPhoto({
  item,
  className,
}: {
  item: { imageUrl: string | null; name: string };
  className?: string;
}) {
  return item.imageUrl ? (
    <OptimizedImage
      image={{ id: item.imageUrl, url: item.imageUrl }}
      alt={`${item.name} daylily`}
      size="full"
      className={cn("size-full object-cover", className)}
    />
  ) : (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-[#e8ede4] text-[#6d7b70]",
        className,
      )}
    >
      <ImageIcon className="size-8" />
    </div>
  );
}

export function CultivarCollectionStep({
  addCultivarToCollection,
  cultivarQuery,
  cultivarSearchError,
  cultivarSearchIsLoading,
  cultivarSearchResults,
  draft,
  removeCultivarFromCollection,
  setCultivarQuery,
}: CultivarSearchProps) {
  const selectedIds = new Set(
    draft.collection.map((item) => item.cultivarReferenceId),
  );

  return (
    <section className="mx-auto max-w-6xl space-y-7">
      <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-end">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
            Your real collection
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-[#142118] md:text-5xl">
            Find daylilies you actually grow.
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-7 text-[#536357]">
          Search the complete Daylily Catalog cultivar database. Choose up to
          five and we will build the rest of this private preview from their
          real registration data and best available photos.
        </p>
      </div>

      <div className="border-y border-[#cbd4c8]">
        <div className="border-b border-[#d8dfd2] bg-[#142118] px-4 py-5 text-white md:p-7">
          <Label
            htmlFor="onboarding-cultivar-search"
            className="text-[#f4c477]"
          >
            Search cultivar names
          </Label>
          <div className="relative mt-2">
            <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#647468]" />
            <Input
              id="onboarding-cultivar-search"
              data-testid="onboarding-cultivar-search"
              value={cultivarQuery}
              onChange={(event) => setCultivarQuery(event.target.value)}
              placeholder="Try Primal Scream, Coffee Frenzy, or a cultivar you grow"
              autoComplete="off"
              className="h-13 border-white/20 bg-white pl-12 text-base text-[#142118]"
            />
          </div>
          <p className="mt-2 text-xs text-[#bdc9ba]">
            This is the same cultivar registry used when growers create real
            listings.
          </p>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-h-56 py-4 md:min-h-72 md:p-7">
            {cultivarQuery.trim().length < 3 ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <Database className="size-9 text-[#b7791f]" />
                <p className="mt-4 font-semibold text-[#142118]">
                  Search hundreds of thousands of cultivar records
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#657267]">
                  Names, hybridizers, registration years, traits, parentage, and
                  our curated image library are ready to enrich your list.
                </p>
              </div>
            ) : cultivarSearchIsLoading ? (
              <div
                className="flex min-h-56 items-center justify-center text-sm text-[#657267]"
                role="status"
              >
                Searching the real cultivar database…
              </div>
            ) : cultivarSearchError ? (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
                The cultivar search could not load. Try again in a moment.
              </p>
            ) : cultivarSearchResults.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <p className="font-semibold">No cultivars matched yet.</p>
                <p className="mt-2 text-sm text-[#657267]">
                  Check the spelling or try the first few words of the name.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 sm:gap-x-5">
                {cultivarSearchResults.map((cultivar) => {
                  const selected = selectedIds.has(
                    cultivar.cultivarReferenceId,
                  );
                  const imageUrl =
                    cultivar.image?.url ?? cultivar.ahsImageUrl ?? null;
                  return (
                    <article
                      key={cultivar.cultivarReferenceId}
                      className="grid grid-cols-[4.75rem_1fr] border-b border-[#d8dfd2] py-3"
                    >
                      <div className="aspect-square">
                        <CultivarPhoto
                          item={{ imageUrl, name: cultivar.name }}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col justify-between gap-3 p-3">
                        <div>
                          <h3 className="font-semibold text-[#142118]">
                            {cultivar.name}
                          </h3>
                          <p className="text-xs text-[#657267]">
                            {[cultivar.hybridizer, cultivar.year]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={selected ? "secondary" : "outline"}
                          disabled={selected || draft.collection.length >= 5}
                          onClick={() => addCultivarToCollection(cultivar)}
                          aria-label={`Add ${cultivar.name} to your preview`}
                          className="w-fit"
                        >
                          {selected ? <Check className="size-4" /> : null}
                          {selected ? "Added" : "Add cultivar"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="border-t border-[#d8dfd2] bg-[#f4f1e8] p-5 md:border-t-0 md:border-l">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-[#142118]">Your preview</p>
              <span className="text-xs text-[#657267]">
                {draft.collection.length}/5
              </span>
            </div>
            {draft.collection.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#657267]">
                Add at least two cultivars so the transformation is clear.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {draft.collection.map((item) => (
                  <div
                    key={item.cultivarReferenceId}
                    className="flex items-center gap-3 border-b border-[#d8dfd2] py-2"
                  >
                    <div className="size-10 shrink-0 overflow-hidden">
                      <CultivarPhoto item={item} />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        removeCultivarFromCollection(item.cultivarReferenceId)
                      }
                      aria-label={`Remove ${item.name}`}
                      className="rounded-full p-1 text-[#657267] hover:bg-[#ece7da]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
        <div className="border-t border-[#d8dfd2] py-4 text-sm leading-6 text-[#536357]">
          <strong className="text-[#142118]">
            This is a 2–5 cultivar preview.
          </strong>{" "}
          You are not expected to enter your whole collection here. These trial
          selections stay in this browser and do not become real listings. After
          signup, add only the cultivars you want in your live catalog and use
          the same registry search to link their data and photos.
        </div>
      </div>
    </section>
  );
}

function DataPill({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[0.65rem] font-bold tracking-wide text-[#8b5c1c] uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-[#142118]">{value}</dd>
    </div>
  );
}

function EmptyCollectionState() {
  return (
    <section className="mx-auto max-w-2xl border-y border-[#d8dfd2] py-8 text-center">
      <h2 className="text-2xl font-semibold text-[#142118]">
        Choose at least two cultivars first
      </h2>
      <p className="mt-3 text-[#536357]">
        Go back to the cultivar search so this preview can use real plant data
        and photos.
      </p>
    </section>
  );
}

export function CollectionEnrichmentStep({
  draft,
}: Pick<AnonymousOnboardingController, "draft">) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featured = draft.collection[0];
  if (!featured) {
    return <EmptyCollectionState />;
  }
  const activeFeatured = draft.collection[featuredIndex] ?? featured;
  return (
    <section className="mx-auto max-w-6xl space-y-7">
      <div className="text-center">
        <Badge className="bg-[#fff1d5] text-[#8a5c16] hover:bg-[#fff1d5]">
          Your information + our cultivar database
        </Badge>
        <h2 className="mx-auto mt-4 max-w-4xl text-3xl leading-tight font-semibold text-[#142118] md:text-5xl">
          A few spreadsheet cells become a buyer-ready catalog.
        </h2>
      </div>

      <div
        className="grid items-stretch gap-4 md:grid-cols-[0.82fr_auto_1.18fr]"
        data-testid="onboarding-enrichment-split"
      >
        <div className="overflow-hidden rounded-3xl border border-[#d8dfd2] bg-white">
          <div className="flex items-center gap-2 border-b bg-[#edf0eb] px-5 py-4">
            <FileSpreadsheet className="size-4 text-[#536357]" />
            <p className="text-sm font-semibold">Your collection before</p>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-80 border-collapse text-left text-sm">
              <thead className="text-xs text-[#657267]">
                <tr>
                  <th className="border p-2">Cultivar</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {draft.collection.map((item) => (
                  <tr key={item.cultivarReferenceId}>
                    <td className="border p-2 font-medium">{item.name}</td>
                    <td className="border p-2">{item.quantity ?? "—"}</td>
                    <td className="border p-2">
                      {item.price === null ? "—" : `$${item.price}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 pb-5 text-sm leading-6 text-[#657267]">
            Enough for you to recognize inventory. Not enough for a buyer to
            understand the plant.
          </p>
        </div>

        <div className="flex items-center justify-center">
          <span className="flex size-12 rotate-90 items-center justify-center rounded-full bg-[#f4c477] text-[#142118] shadow-lg md:rotate-0">
            <ArrowRight className="size-5" />
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#b9c9b6] bg-[#142118] text-white shadow-[0_30px_80px_-55px_rgba(20,33,24,1)]">
          <div
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:thin]"
            onScroll={(event) => {
              const width = event.currentTarget.clientWidth;
              if (width > 0) {
                setFeaturedIndex(
                  Math.round(event.currentTarget.scrollLeft / width),
                );
              }
            }}
          >
            {draft.collection.map((item) => (
              <div
                key={item.cultivarReferenceId}
                className="relative aspect-[16/9] min-w-full snap-start overflow-hidden"
              >
                <CultivarPhoto
                  item={item}
                  className="transition-transform duration-700 hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#142118] to-transparent p-5 pt-16">
                  <p className="text-2xl font-semibold">{item.name}</p>
                  <p className="text-sm text-[#d8e3d5]">
                    {[item.hybridizer, item.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-b border-white/10 px-5 py-2 text-xs text-[#d8e3d5]">
            {draft.collection.length} enriched cultivar
            {draft.collection.length === 1 ? "" : "s"} · swipe to compare
          </div>
          <div className="bg-[#fbfaf4] p-5 text-[#142118]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#8a5c16]">
              <Sparkles className="size-4" />
              Daylily Catalog automatically adds
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DataPill label="Scape" value={activeFeatured.scapeHeight} />
              <DataPill label="Bloom" value={activeFeatured.bloomSize} />
              <DataPill label="Season" value={activeFeatured.bloomSeason} />
              <DataPill label="Form" value={activeFeatured.form} />
              <DataPill label="Ploidy" value={activeFeatured.ploidy} />
              <DataPill label="Foliage" value={activeFeatured.foliageType} />
            </dl>
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-[#657267]">
        The cultivar facts and photos stay connected to every listing. You add
        only the seller-specific details: price, availability, and notes.
      </p>
    </section>
  );
}

export function ListingsWorkspaceStep({
  draft,
  updateCollectionItem,
}: Pick<AnonymousOnboardingController, "draft" | "updateCollectionItem">) {
  const [selectedId, setSelectedId] = useState(
    draft.collection[0]?.cultivarReferenceId ?? "",
  );
  if (draft.collection.length === 0) return <EmptyCollectionState />;
  const selected =
    draft.collection.find((item) => item.cultivarReferenceId === selectedId) ??
    draft.collection[0]!;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
            Private listings workspace
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#142118] md:text-5xl">
            Now make the inventory yours.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#536357]">
            This uses your real cultivar selections and mirrors the listings
            workspace. Changes remain in this browser and nothing is published.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-700/30 text-emerald-800"
        >
          Private preview · browser only
        </Badge>
      </div>

      <div className="overflow-hidden border-y border-[#cbd4c8] bg-white/55 md:border-x">
        <div className="border-b bg-[#f4f1e8] p-3 md:hidden">
          <Label htmlFor="workspace-listing-select">Editing listing</Label>
          <select
            id="workspace-listing-select"
            value={selected.cultivarReferenceId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border bg-white px-3"
          >
            {draft.collection.map((item) => (
              <option
                key={item.cultivarReferenceId}
                value={item.cultivarReferenceId}
              >
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div
          className="grid md:grid-cols-[15rem_minmax(0,1fr)_19rem]"
          data-testid="onboarding-workspace-split"
        >
          <nav
            className="hidden border-r bg-[#f4f1e8] p-3 md:block"
            aria-label="Preview listings"
          >
            <p className="px-2 py-2 text-xs font-bold tracking-wide text-[#657267] uppercase">
              Listings ({draft.collection.length})
            </p>
            <div className="space-y-1">
              {draft.collection.map((item) => (
                <button
                  key={item.cultivarReferenceId}
                  type="button"
                  onClick={() => setSelectedId(item.cultivarReferenceId)}
                  className={cn(
                    "w-full rounded-xl px-3 py-3 text-left text-sm",
                    selected.cultivarReferenceId === item.cultivarReferenceId
                      ? "bg-[#142118] text-white"
                      : "hover:bg-white",
                  )}
                >
                  <span className="block truncate font-semibold">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs opacity-70">
                    {item.status === "for_sale" ? "For sale" : "Display only"}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="space-y-5 p-5 md:p-7">
            <div className="flex items-center gap-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                <CultivarPhoto item={selected} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selected.name}</h3>
                <p className="text-sm text-[#657267]">
                  {[selected.hybridizer, selected.year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`quantity-${selected.cultivarReferenceId}`}>
                  Quantity
                </Label>
                <Input
                  id={`quantity-${selected.cultivarReferenceId}`}
                  aria-label={`Quantity for ${selected.name}`}
                  type="number"
                  min="0"
                  value={selected.quantity ?? ""}
                  onChange={(event) =>
                    updateCollectionItem(selected.cultivarReferenceId, {
                      quantity: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`price-${selected.cultivarReferenceId}`}>
                  Price
                </Label>
                <Input
                  id={`price-${selected.cultivarReferenceId}`}
                  aria-label={`Price for ${selected.name}`}
                  type="number"
                  min="0"
                  value={selected.price ?? ""}
                  onChange={(event) =>
                    updateCollectionItem(selected.cultivarReferenceId, {
                      price: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`status-${selected.cultivarReferenceId}`}>
                  Visibility
                </Label>
                <select
                  id={`status-${selected.cultivarReferenceId}`}
                  value={selected.status}
                  onChange={(event) =>
                    updateCollectionItem(selected.cultivarReferenceId, {
                      status:
                        event.target.value === "display_only"
                          ? "display_only"
                          : "for_sale",
                    })
                  }
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                >
                  <option value="for_sale">For sale</option>
                  <option value="display_only">Display only</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description-${selected.cultivarReferenceId}`}>
                Your seller notes
              </Label>
              <Textarea
                id={`description-${selected.cultivarReferenceId}`}
                value={selected.description}
                onChange={(event) =>
                  updateCollectionItem(selected.cultivarReferenceId, {
                    description: event.target.value,
                  })
                }
                rows={4}
              />
              <p className="text-xs text-[#657267]">
                Cultivar facts and the library photo stay linked automatically.
              </p>
            </div>
          </div>

          <aside className="border-t bg-[#fbfaf4] p-4 md:border-t-0 md:border-l">
            <p className="mb-3 text-xs font-bold tracking-wide text-[#657267] uppercase">
              Buyer-visible card
            </p>
            <ListingCard
              listing={toPreviewListing(selected, draft.profile.gardenName)}
              onOpenListing={() => undefined}
              showCart={false}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

type PublicListing = RouterOutputs["public"]["getListings"][number];

function toPreviewListing(
  item: AnonymousOnboardingCollectionItem,
  gardenName: string,
): PublicListing {
  const ahsListing = {
    id: item.cultivarReferenceId,
    name: item.name,
    ahsImageUrl: item.imageUrl,
    hybridizer: item.hybridizer,
    year: item.year,
    scapeHeight: item.scapeHeight,
    bloomSize: item.bloomSize,
    bloomSeason: item.bloomSeason,
    ploidy: item.ploidy,
    foliageType: item.foliageType,
    bloomHabit: null,
    color: item.color,
    form: item.form,
    parentage: item.parentage,
    fragrance: item.fragrance,
    budcount: null,
    branches: null,
    sculpting: null,
    foliage: null,
    flower: null,
  };
  const updatedAt = new Date();
  return {
    id: `preview-${item.cultivarReferenceId}`,
    title: item.name,
    slug: null,
    description: item.description,
    price: item.status === "for_sale" ? item.price : null,
    userId: "onboarding-preview",
    updatedAt,
    user: {
      profile: { slug: "your-garden", title: gardenName || "Your Garden" },
    },
    lists: [],
    cultivarReference: {
      id: item.cultivarReferenceId,
      normalizedName:
        normalizeCultivarName(item.name) ?? item.name.toLowerCase(),
      v2AhsCultivar: {
        id: item.cultivarReferenceId,
        post_title: item.name,
        introduction_date: item.year,
        primary_hybridizer_name: item.hybridizer,
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: item.bloomSeason,
        fragrance_names: item.fragrance,
        bloom_habit_names: null,
        foliage_names: item.foliageType,
        ploidy_names: item.ploidy,
        scape_height_in: Number.parseFloat(item.scapeHeight ?? "") || null,
        bloom_size_in: Number.parseFloat(item.bloomSize ?? "") || null,
        bud_count: null,
        branches: null,
        color: item.color,
        flower_form_names: item.form,
        unusual_forms_names: null,
        parentage: item.parentage,
        image_url: item.imageUrl,
      },
      ahsListing,
    },
    images: item.imageUrl
      ? [
          {
            id: `image-${item.cultivarReferenceId}`,
            url: item.imageUrl,
            updatedAt,
          },
        ]
      : [],
    ahsListing,
    cultivarReferenceImage: item.imageUrl
      ? { id: `image-${item.cultivarReferenceId}`, url: item.imageUrl }
      : null,
    userSlug: "your-garden",
    sellerTitle: gardenName || "Your Garden",
  } as unknown as PublicListing;
}

export function BuyerCatalogStep({
  draft,
  embedded = false,
  markProofViewed,
}: Pick<AnonymousOnboardingController, "draft" | "markProofViewed"> & {
  embedded?: boolean;
}) {
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const listings = useMemo(
    () =>
      draft.collection.map((item) =>
        toPreviewListing(item, draft.profile.gardenName),
      ),
    [draft.collection, draft.profile.gardenName],
  );
  const selected = draft.collection.find(
    (item) => item.cultivarReferenceId === selectedListing,
  );
  useEffect(() => {
    if (draft.collection.length > 0) markProofViewed("catalog");
  }, [draft.collection.length, markProofViewed]);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      {!embedded ? (
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
            Real buyer catalog
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#142118] md:text-5xl">
            This is what buyers get from your list.
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#536357]">
            Search the same enriched listings you just edited. The cards below
            use the production catalog card rather than a special onboarding
            imitation.
          </p>
        </div>
      ) : null}

      <div className="border-y border-[#cbd4c8] py-4 md:py-6">
        <PublicCatalogSearchContent
          lists={[]}
          listings={listings}
          isLoading={false}
          totalListingsCount={listings.length}
          storageKey="onboarding-catalog-preview-table"
          showCart={false}
          onOpenListing={(listingId) => {
            const item = draft.collection.find(
              (candidate) =>
                `preview-${candidate.cultivarReferenceId}` === listingId,
            );
            if (!item) return;
            setSelectedListing(item.cultivarReferenceId);
            capturePosthogEvent("onboarding_buyer_catalog_interacted", {
              flow_version: draft.flowVersion,
              draft_id: draft.draftId,
              interaction_type: "listing_opened",
              cultivar_reference_id: item.cultivarReferenceId,
            });
          }}
        />
      </div>

      {selected ? (
        <div
          className="rounded-3xl border border-[#d8dfd2] bg-[#fbfaf4] p-5"
          role="dialog"
          aria-label={`${selected.name} listing details`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#a94e38] uppercase">
                Listing detail
              </p>
              <h3 className="mt-1 text-2xl font-semibold">{selected.name}</h3>
              <p className="text-sm text-[#657267]">
                {[selected.hybridizer, selected.year]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedListing(null)}
              aria-label="Close listing details"
            >
              <X className="size-4" />
            </Button>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DataPill label="Bloom season" value={selected.bloomSeason} />
            <DataPill label="Scape" value={selected.scapeHeight} />
            <DataPill label="Bloom" value={selected.bloomSize} />
            <DataPill label="Form" value={selected.form} />
            <DataPill label="Ploidy" value={selected.ploidy} />
            <DataPill label="Foliage" value={selected.foliageType} />
            <DataPill label="Color" value={selected.color} />
            <DataPill label="Parentage" value={selected.parentage} />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

export function SocialShareStep({
  draft,
  markProofViewed,
  embedded = false,
}: Pick<AnonymousOnboardingController, "draft" | "markProofViewed"> & {
  embedded?: boolean;
}) {
  const [platform, setPlatform] = useState<"imessage" | "facebook">("imessage");
  const listing = draft.collection[0];
  useEffect(() => {
    if (listing) markProofViewed("listing");
  }, [listing, markProofViewed]);
  if (!listing) return <EmptyCollectionState />;
  const description = `${listing.hybridizer ?? "Registered cultivar"}${listing.year ? `, ${listing.year}` : ""} · ${listing.description}`;

  return (
    <section className="mx-auto max-w-5xl space-y-7">
      {!embedded ? (
        <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
              One link carries the details
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#142118] md:text-5xl">
              Share the listing, not another explanation.
            </h2>
          </div>
          <p className="leading-7 text-[#536357]">
            Facebook and iMessage automatically show your cultivar photo, title,
            price, and seller notes when you share a published listing. Behind
            the scenes, each link includes a social-ready image and description.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex border-b border-[#cbd4c8]">
            {(["imessage", "facebook"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPlatform(option);
                  capturePosthogEvent("onboarding_share_preview_viewed", {
                    flow_version: draft.flowVersion,
                    draft_id: draft.draftId,
                    platform: option,
                  });
                }}
                className={cn(
                  "flex flex-1 items-center gap-2 border-b-2 px-2 py-3 text-left",
                  platform === option
                    ? "border-[#b7791f] text-[#142118]"
                    : "border-transparent text-[#657267]",
                )}
              >
                {option === "imessage" ? (
                  <MessageCircle className="size-5 text-blue-600" />
                ) : (
                  <MessageCircle className="size-5 text-[#1877f2]" />
                )}
                <span className="font-semibold">
                  {option === "imessage" ? "iMessage" : "Facebook"}
                </span>
              </button>
            ))}
          </div>
          <div className="border-b border-[#cbd4c8] py-4">
            <Share2 className="size-5 text-[#a94e38]" />
            <p className="mt-3 text-sm font-semibold text-[#142118]">
              What travels with the link
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-[#657267]">
              <li>Beautiful cultivar or listing photo</li>
              <li>Listing title and seller description</li>
              <li>Price and complete linked cultivar page</li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "rounded-[2rem] p-4 md:p-8",
            platform === "imessage" ? "bg-[#e9e9ee]" : "bg-[#f0f2f5]",
          )}
        >
          <div className="mx-auto max-w-md">
            <div
              className={cn(
                "mb-3 w-fit max-w-[85%] rounded-2xl px-4 py-2 text-sm text-white",
                platform === "imessage"
                  ? "ml-auto bg-[#0b84ff]"
                  : "bg-[#1877f2]",
              )}
            >
              Is this one still available?
            </div>
            <div className="ml-auto w-[88%] overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="aspect-[1.91/1] overflow-hidden">
                <CultivarPhoto item={listing} />
              </div>
              <div className="space-y-1 p-4">
                <p className="text-[0.65rem] font-semibold tracking-wide text-[#657267] uppercase">
                  DAYLILYCATALOG.COM
                </p>
                <h3 className="text-lg font-semibold text-[#142118]">
                  {listing.name}
                  {listing.price !== null && listing.status === "for_sale"
                    ? ` — $${listing.price}`
                    : ""}
                </h3>
                <p className="line-clamp-2 text-sm leading-5 text-[#536357]">
                  {description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-[#536357]">
              <Link2 className="size-3.5" />
              Faithful preview of the listing’s real share metadata
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BuyerExperienceStep({
  draft,
  markProofViewed,
}: Pick<AnonymousOnboardingController, "draft" | "markProofViewed">) {
  const [view, setView] = useState<"share" | "catalog">("share");
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
          What buyers receive
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[#142118] md:text-5xl">
          One listing works wherever buyers find you.
        </h2>
        <p className="mt-3 leading-7 text-[#536357]">
          Share a rich link in a message, or let buyers search the whole catalog
          themselves. Try both views using the listings you just edited.
        </p>
      </div>

      <div className="flex border-b border-[#cbd4c8]" role="tablist">
        {(["share", "catalog"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-semibold",
              view === option
                ? "border-[#a94e38] text-[#142118]"
                : "border-transparent text-[#657267]",
            )}
          >
            {option === "share" ? "Shared link" : "Buyer catalog"}
          </button>
        ))}
      </div>

      {view === "share" ? (
        <SocialShareStep
          draft={draft}
          embedded
          markProofViewed={markProofViewed}
        />
      ) : (
        <BuyerCatalogStep
          draft={draft}
          embedded
          markProofViewed={markProofViewed}
        />
      )}
    </section>
  );
}
