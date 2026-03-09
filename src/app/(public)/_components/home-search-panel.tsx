"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flower2, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import type { HomeFeaturedCultivar } from "@/types";
import type { PublicProfile } from "@/types/public-types";

type HomeSearchMode = "cultivars" | "catalogs";

interface HomeSearchPanelProps {
  catalogs: PublicProfile[];
  featuredCultivars: HomeFeaturedCultivar[];
}

function getCatalogPath(catalog: PublicProfile) {
  return `/${catalog.slug ?? catalog.id}`;
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().trim();
}

export function HomeSearchPanel({
  catalogs,
  featuredCultivars,
}: HomeSearchPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomeSearchMode>("cultivars");
  const [cultivarQuery, setCultivarQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");

  const deferredCultivarQuery = useDeferredValue(cultivarQuery.trim());
  const deferredCatalogQuery = useDeferredValue(catalogQuery.trim());
  const normalizedCatalogQuery = normalizeSearchValue(deferredCatalogQuery);

  const cultivarSearch = api.public.searchCultivars.useQuery(
    {
      query: deferredCultivarQuery,
    },
    {
      enabled: activeTab === "cultivars" && deferredCultivarQuery.length >= 2,
    },
  );

  const catalogMatches =
    normalizedCatalogQuery.length === 0
      ? catalogs.slice(0, 4)
      : catalogs
          .filter((catalog) => {
            const haystack = [
              catalog.title,
              catalog.location,
              catalog.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return haystack.includes(normalizedCatalogQuery);
          })
          .slice(0, 5);

  const cultivarMatches =
    deferredCultivarQuery.length >= 2 ? (cultivarSearch.data ?? []) : [];

  const handleCultivarSubmit = () => {
    const firstMatch = cultivarMatches[0];

    if (!firstMatch) {
      return;
    }

    router.push(`/cultivar/${firstMatch.segment}`);
  };

  const handleCatalogSubmit = () => {
    const firstMatch = catalogMatches[0];

    if (!firstMatch) {
      router.push("/catalogs");
      return;
    }

    router.push(getCatalogPath(firstMatch));
  };

  return (
    <div
      id="home-search"
      className="bg-background/95 text-foreground rounded-[1.75rem] border border-white/20 p-4 shadow-2xl backdrop-blur md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide uppercase">
            Start exploring
          </p>
          <p className="text-muted-foreground text-sm">
            Search the database or jump straight into public catalogs.
          </p>
        </div>
        <Badge variant="secondary" className="hidden lg:inline-flex">
          Discovery first
        </Badge>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as HomeSearchMode)}
      >
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="cultivars" className="gap-2 py-2">
            <Flower2 className="h-4 w-4" />
            Cultivars
          </TabsTrigger>
          <TabsTrigger value="catalogs" className="gap-2 py-2">
            <Store className="h-4 w-4" />
            Catalogs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cultivars" className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleCultivarSubmit();
            }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  value={cultivarQuery}
                  onChange={(event) => setCultivarQuery(event.target.value)}
                  placeholder="Search cultivar names"
                  className="h-12 pl-10 text-base"
                  aria-label="Search cultivars"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12"
                disabled={cultivarMatches.length === 0}
              >
                Search cultivars
              </Button>
            </div>

            <div className="bg-muted/30 rounded-xl border p-3">
              {deferredCultivarQuery.length < 2 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Try one of these cultivar pages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {featuredCultivars.slice(0, 4).map((cultivar) => (
                      <Button
                        key={cultivar.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/cultivar/${cultivar.segment}`)
                        }
                      >
                        {cultivar.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : cultivarSearch.isLoading ? (
                <p className="text-muted-foreground text-sm">
                  Searching cultivar database...
                </p>
              ) : cultivarMatches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No cultivar matches yet. Try a different starting phrase.
                </p>
              ) : (
                <div className="space-y-2">
                  {cultivarMatches.map((cultivar) => (
                    <button
                      key={cultivar.cultivarReferenceId}
                      type="button"
                      onClick={() =>
                        router.push(`/cultivar/${cultivar.segment}`)
                      }
                      className="hover:bg-background flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition"
                    >
                      <span className="font-medium">{cultivar.name}</span>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="catalogs" className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleCatalogSubmit();
            }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="Search garden names or locations"
                  className="h-12 pl-10 text-base"
                  aria-label="Search catalogs"
                />
              </div>

              <Button type="submit" size="lg" className="h-12">
                Search catalogs
              </Button>
            </div>

            <div className="bg-muted/30 rounded-xl border p-3">
              {catalogMatches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No catalog matches found. Browse the full directory instead.
                </p>
              ) : (
                <div className="space-y-2">
                  {catalogMatches.map((catalog) => (
                    <button
                      key={catalog.id}
                      type="button"
                      onClick={() => router.push(getCatalogPath(catalog))}
                      className="hover:bg-background flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition"
                    >
                      <div>
                        <p className="font-medium">
                          {catalog.title ?? "Unnamed Garden"}
                        </p>
                        {catalog.location ? (
                          <p className="text-muted-foreground text-sm">
                            {catalog.location}
                          </p>
                        ) : null}
                      </div>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
