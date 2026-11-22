"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flower2, Menu } from "lucide-react";
import { Small } from "@/components/typography";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { useFeature } from "@/hooks/use-feature";

const activeNavClassName =
  "font-semibold underline decoration-current/35 underline-offset-8";
const growerMarketingPaths = new Set([
  "/start-membership",
  "/daylily-database-software",
  "/sell-daylilies-online",
]);

export function isGrowerMarketingPath(pathname: string) {
  return growerMarketingPaths.has(pathname);
}

export function PublicHeader() {
  const pathname = usePathname();
  const cultivarSearchEnabled = useFeature("publicCultivarSearch");
  const catalogImporterDiscoveryEnabled = useFeature(
    "catalogImporterDiscovery",
  );
  const mobileNavRef = useRef<HTMLDetailsElement>(null);
  const isGrowerMarketingPage = isGrowerMarketingPath(pathname);
  const usesDarkHeroNav =
    pathname === "/" || isGrowerMarketingPage || pathname === "/cultivars";
  const isCultivarsActive =
    pathname === "/cultivars" || pathname.startsWith("/cultivar/");
  const isPlaygroundActive =
    pathname === "/playground" || pathname.startsWith("/playground/");
  const isCatalogsActive = pathname === "/catalogs";
  const isGrowersActive = isGrowerMarketingPage;

  useEffect(() => {
    mobileNavRef.current?.removeAttribute("open");
  }, [pathname]);

  return (
    <header
      className={cn(
        "public-header relative z-50 flex min-h-16 w-full shrink-0 items-center border-none bg-transparent px-3 py-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-bottom-5 lg:h-20 lg:px-8 lg:py-0",
        usesDarkHeroNav ? "text-white" : "text-public-ink",
      )}
    >
      <nav className="mx-auto flex w-full max-w-256 items-center justify-between gap-2 py-1 lg:gap-4">
        <Link
          href="/"
          className="focus-visible:ring-public-gold-light flex shrink-0 items-center gap-1.5 text-current transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:outline-none lg:gap-3"
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center lg:h-8 lg:w-8",
              usesDarkHeroNav ? "text-public-gold-light" : "text-public-gold",
            )}
          >
            <Flower2 className="h-5 w-5 lg:h-6 lg:w-6" />
          </span>
          <Small className="text-sm leading-none font-semibold whitespace-nowrap text-current lg:text-base">
            Daylily Catalog
          </Small>
        </Link>

        <details
          ref={mobileNavRef}
          className="group relative shrink-0 lg:hidden"
          data-testid="mobile-public-nav"
        >
          <summary
            aria-label="Open public navigation"
            className={cn(
              "focus-visible:ring-public-gold-light flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border bg-transparent transition-colors focus-visible:ring-1 focus-visible:outline-none [&::-webkit-details-marker]:hidden",
              usesDarkHeroNav
                ? "border-white/30 text-white hover:bg-white/10"
                : "border-public-ink/20 text-public-ink hover:bg-public-ink/5",
            )}
          >
            <Menu className="size-4" />
            <span className="sr-only">Open public navigation</span>
          </summary>
          <ul className="border-public-ink/10 text-public-ink absolute top-full right-0 mt-1 w-56 overflow-hidden rounded-md border bg-white/85 p-1 text-sm shadow-md backdrop-blur-xl">
            {cultivarSearchEnabled ? (
              <li>
                <Link
                  href="/cultivars"
                  aria-current={isCultivarsActive ? "page" : undefined}
                  className={cn(
                    "hover:bg-public-ink/8 block rounded-sm px-2 py-1.5",
                    isCultivarsActive && activeNavClassName,
                  )}
                >
                  Search cultivars
                </Link>
              </li>
            ) : null}
            {catalogImporterDiscoveryEnabled ? (
              <li>
                <Link
                  href="/playground"
                  aria-current={isPlaygroundActive ? "page" : undefined}
                  className={cn(
                    "hover:bg-public-ink/8 block rounded-sm px-2 py-1.5",
                    isPlaygroundActive && activeNavClassName,
                  )}
                >
                  Playground
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/catalogs"
                aria-current={isCatalogsActive ? "page" : undefined}
                className={cn(
                  "hover:bg-public-ink/8 block rounded-sm px-2 py-1.5",
                  isCatalogsActive && activeNavClassName,
                )}
              >
                Browse catalogs
              </Link>
            </li>
            <li>
              <Link
                href="/start-membership"
                aria-current={isGrowersActive ? "page" : undefined}
                className={cn(
                  "hover:bg-public-ink/8 block rounded-sm px-2 py-1.5",
                  isGrowersActive && activeNavClassName,
                )}
              >
                For growers
              </Link>
            </li>
            <li className="border-public-ink/10 mt-1 border-t pt-1">
              <Link
                href={SUBSCRIPTION_CONFIG.PATHS.DASHBOARD_SIGN_IN}
                className="hover:bg-public-ink/8 block rounded-sm px-2 py-1.5"
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </details>

        <div className="hidden items-center gap-4 lg:ml-auto lg:flex">
          {cultivarSearchEnabled ? (
            <Link
              href="/cultivars"
              aria-current={isCultivarsActive ? "page" : undefined}
              className={cn(
                "px-3 py-2 text-base text-current transition-opacity hover:opacity-70 focus-visible:ring-1 focus-visible:ring-current focus-visible:outline-none",
                isCultivarsActive && activeNavClassName,
              )}
            >
              Search cultivars
            </Link>
          ) : null}
          {catalogImporterDiscoveryEnabled ? (
            <Link
              href="/playground"
              aria-current={isPlaygroundActive ? "page" : undefined}
              className={cn(
                "px-3 py-2 text-base text-current transition-opacity hover:opacity-70 focus-visible:ring-1 focus-visible:ring-current focus-visible:outline-none",
                isPlaygroundActive && activeNavClassName,
              )}
            >
              Playground
            </Link>
          ) : null}

          <Link
            href="/catalogs"
            aria-current={isCatalogsActive ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-base text-current transition-opacity hover:opacity-70 focus-visible:ring-1 focus-visible:ring-current focus-visible:outline-none",
              isCatalogsActive && activeNavClassName,
            )}
          >
            Browse catalogs
          </Link>

          <Link
            href="/start-membership"
            aria-current={isGrowersActive ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-base text-current transition-opacity hover:opacity-70 focus-visible:ring-1 focus-visible:ring-current focus-visible:outline-none",
              isGrowersActive && activeNavClassName,
            )}
          >
            For growers
          </Link>

          <form action={SUBSCRIPTION_CONFIG.PATHS.DASHBOARD_SIGN_IN}>
            <Button
              className="ml-2"
              variant={usesDarkHeroNav ? "public-inverse" : "public"}
              size="nav"
              type="submit"
            >
              Dashboard
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
