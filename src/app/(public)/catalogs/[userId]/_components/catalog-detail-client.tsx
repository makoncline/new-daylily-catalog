"use client";

import * as React from "react";
import { api } from "@/trpc/react";
import { ImageGallery } from "@/components/image-gallery";
import { MainContent } from "@/app/(public)/_components/main-content";
import { PageHeader } from "@/app/dashboard/_components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, MapPin } from "lucide-react";
import { useDataTable } from "@/hooks/use-data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { EditorOutput } from "@/components/editor/editor-output";
import type { RouterOutputs } from "@/trpc/shared";
import { type OutputData } from "@editorjs/editorjs";

type Profile = RouterOutputs["public"]["getProfile"];
type Listing = RouterOutputs["public"]["getListings"][number];

interface CatalogDetailClientProps {
  userId: string;
}

const columns: ColumnDef<Listing>[] = [
  {
    id: "name",
    accessorFn: (row) => row.name,
  },
];

export function CatalogDetailClient({ userId }: CatalogDetailClientProps) {
  const [selectedListId, setSelectedListId] = React.useState<string | null>(
    null,
  );
  const [activeSection, setActiveSection] = React.useState("profile");

  // Handle smooth scrolling on nav click
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    section: string,
  ) => {
    e.preventDefault();
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      window.location.hash = section;
    }
  };

  // Track active section based on URL hash
  React.useEffect(() => {
    const updateActiveSection = () => {
      const hash = window.location.hash.slice(1) || "profile";
      setActiveSection(hash);
    };

    window.addEventListener("hashchange", updateActiveSection);
    updateActiveSection();

    return () => window.removeEventListener("hashchange", updateActiveSection);
  }, []);

  const { data: profile, isLoading: isLoadingProfile } =
    api.public.getProfile.useQuery({ userId });
  const { data: listings, isLoading: isLoadingListings } =
    api.public.getListings.useQuery(
      { userId, listId: selectedListId ?? undefined },
      {
        enabled: !!userId,
      },
    );

  const table = useDataTable({
    data: listings ?? [],
    columns,
    storageKey: "catalog-listings-table",
    config: {
      initialState: {
        pagination: {
          pageSize: 12,
        },
      },
    },
  });

  // Helper function to determine nav link classes
  const getNavLinkClasses = (section: string) => {
    const baseClasses =
      "px-1 py-4 text-sm font-medium border-b-2 transition-colors";
    return `${baseClasses} ${
      activeSection === section
        ? "border-primary text-primary"
        : "border-transparent hover:border-primary/50 text-muted-foreground hover:text-foreground"
    }`;
  };

  if (isLoadingProfile || isLoadingListings) {
    return <CatalogDetailSkeleton />;
  }

  if (!profile) {
    return (
      <MainContent>
        <div className="text-center text-muted-foreground">
          Catalog not found
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
      <div className="space-y-8">
        {/* Navigation */}
        <nav className="border-b">
          <div className="flex gap-6">
            <a
              href="#profile"
              onClick={(e) => handleNavClick(e, "profile")}
              className={getNavLinkClasses("profile")}
            >
              Profile
            </a>
            {profile?.images && profile.images.length > 0 && (
              <a
                href="#images"
                onClick={(e) => handleNavClick(e, "images")}
                className={getNavLinkClasses("images")}
              >
                Images
              </a>
            )}
            {profile?.bio && (
              <a
                href="#bio"
                onClick={(e) => handleNavClick(e, "bio")}
                className={getNavLinkClasses("bio")}
              >
                Bio
              </a>
            )}
            {profile?.lists && profile.lists.length > 0 && (
              <a
                href="#lists"
                onClick={(e) => handleNavClick(e, "lists")}
                className={getNavLinkClasses("lists")}
              >
                Lists
              </a>
            )}
            <a
              href="#listings"
              onClick={(e) => handleNavClick(e, "listings")}
              className={getNavLinkClasses("listings")}
            >
              Listings
            </a>
          </div>
        </nav>

        {/* Title Section */}
        <div id="profile" className="space-y-4">
          <h1 className="text-3xl font-bold">
            {profile.name ?? "Unnamed Garden"}
          </h1>
          {profile.location && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <MapPin className="mr-1 h-3 w-3" />
                {profile.location}
              </Badge>
            </div>
          )}
          {profile.intro && (
            <p className="text-lg text-muted-foreground">{profile.intro}</p>
          )}
        </div>

        {/* Images */}
        {profile.images && profile.images.length > 0 && (
          <div id="images">
            <ImageGallery images={profile.images} />
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div id="bio">
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
          </div>
        )}

        {/* Lists */}
        {profile.lists && profile.lists.length > 0 && (
          <div id="lists" className="space-y-4">
            <h2 className="text-2xl font-semibold">Lists</h2>
            <div className="grid gap-4">
              {profile.lists.map((list) => (
                <Button
                  key={list.id}
                  variant={selectedListId === list.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() =>
                    setSelectedListId(
                      selectedListId === list.id ? null : list.id,
                    )
                  }
                >
                  {list.name}
                  <Badge variant="secondary" className="ml-auto">
                    {list.listingCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        <div id="listings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {selectedListId
                ? `Listings in ${profile.lists.find((l) => l.id === selectedListId)?.name}`
                : "All Listings"}
            </h2>
            <div className="flex items-center gap-2">
              <DataTableGlobalFilter
                table={table}
                placeholder="Search listings..."
              />
              {selectedListId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedListId(null)}
                >
                  Reset filter
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {table.getRowModel().rows.map((row) => (
              <div
                key={row.original.id}
                className="mx-auto w-full max-w-[400px]"
              >
                <ListingCard listing={row.original} />
              </div>
            ))}
          </div>

          <DataTablePagination table={table} />
        </div>
      </div>
    </MainContent>
  );
}

function CatalogDetailSkeleton() {
  return (
    <MainContent>
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Skeleton className="aspect-[16/9] w-full rounded-lg" />
          <div className="space-y-4">
            <div className="flex justify-end">
              <Skeleton className="h-8 w-[200px]" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Skeleton className="h-6 w-[100px]" />
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
}
