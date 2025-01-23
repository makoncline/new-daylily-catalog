"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/app/dashboard/_components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedImage } from "@/components/optimized-image";
import { ImageGallery } from "@/components/image-gallery";
import { EditorOutput } from "@/components/editor/editor-output";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { NoListingsState } from "./no-listings-state";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/truncated-text";
import { parseEditorContent } from "@/lib/editor-utils";
import type { OutputData } from "@editorjs/editorjs";

interface CatalogDetailClientProps {
  userId: string;
}

export function CatalogDetailClient({ userId }: CatalogDetailClientProps) {
  const [selectedListId, setSelectedListId] = React.useState<string | null>(
    null,
  );

  const { data: profile, isLoading: isLoadingProfile } =
    api.public.getProfile.useQuery({
      userId,
    });

  const { data: listings, isLoading: isLoadingListings } =
    api.public.getListings.useQuery({
      userId,
      listId: selectedListId ?? undefined,
    });

  if (isLoadingProfile || isLoadingListings) {
    return <CatalogDetailSkeleton />;
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Images */}
      {profile.images.length > 0 && <ImageGallery images={profile.images} />}

      {/* Lists Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Lists</h2>
        {profile.lists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.lists.map((list) => (
              <Card
                key={list.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-muted/50",
                  selectedListId === list.id && "bg-muted",
                )}
                onClick={() =>
                  setSelectedListId(selectedListId === list.id ? null : list.id)
                }
              >
                <h3 className="text-lg font-semibold">{list.name}</h3>
                <div className="space-y-1">
                  {list.description && (
                    <TruncatedText
                      text={list.description}
                      maxLength={100}
                      className="text-sm text-muted-foreground"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {list.listingCount} listings
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No lists created yet
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="space-y-4">
        {profile.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{profile.location}</span>
          </div>
        )}

        {profile.intro && (
          <div className="text-lg text-muted-foreground">{profile.intro}</div>
        )}

        {profile.bio && (
          <Card>
            <CardContent className="prose dark:prose-invert pt-6">
              <EditorOutput
                content={
                  typeof profile.bio === "string"
                    ? (JSON.parse(profile.bio) as OutputData)
                    : profile.bio
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Listings Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          {selectedListId
            ? `Listings in ${profile.lists.find((l) => l.id === selectedListId)?.name}`
            : "All Listings"}
        </h2>

        {!listings?.length ? (
          <NoListingsState
            isFiltered={!!selectedListId}
            onResetFilter={() => setSelectedListId(null)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Image Skeleton */}
      <div className="aspect-[16/9] rounded-lg bg-muted" />

      {/* Lists Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded bg-muted" />
          ))}
        </div>
      </div>

      {/* Profile Info Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-20 rounded bg-muted" />
      </div>

      {/* Listings Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
