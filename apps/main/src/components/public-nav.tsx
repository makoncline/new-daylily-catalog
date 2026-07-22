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
]);

export function isGrowerMarketingPath(pathname: string) {
  return growerMarketingPaths.has(pathname);
}

export function PublicHeader() {
  const pathname = usePathname();
  const cultivarSearchEnabled = useFeature("publicCultivarSearch");
  const mobileNavRef = useRef<HTMLDetailsElement>(null);
  const isGrowerMarketingPage = isGrowerMarketingPath(pathname);
  const usesDarkHeroNav =
    pathname === "/" || isGrowerMarketingPage || pathname === "/cultivars";
  const isCultivarsActive =
    pathname === "/cultivars" || pathname.startsWith("/cultivar/");
  const isCatalogsActive = pathname === "/catalogs";
  const isGrowersActive =
    isGrowerMarketingPage || pathname.startsWith("/onboarding");

  useEffect(() => {
    mobileNavRef.current?.removeAttribute("open");
  }, [pathname]);

  return (
    <header
      className={cn(
        "public-header relative z-50 flex min-h-16 w-full shrink-0 items-center border-none bg-transparent px-3 py-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-bottom-5 before:z-[-1] before:[mask-image:linear-gradient(to_bottom,#000_0%,#000_calc(100%_-_20px),transparent_100%)] before:backdrop-blur-[5px] before:content-[''] before:[-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_calc(100%_-_20px),transparent_100%)] lg:h-20 lg:px-8 lg:py-0",
        usesDarkHeroNav ? "text-white" : "text-[#142118]",
      )}
    >
      <nav className="mx-auto flex w-full max-w-[1024px] items-center justify-between gap-2 py-1 lg:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-current transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-[#f4c477] focus-visible:outline-none lg:gap-3"
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center lg:h-8 lg:w-8",
              usesDarkHeroNav ? "text-[#f4c477]" : "text-[#b7791f]",
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
              "flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border bg-transparent transition-colors focus-visible:ring-1 focus-visible:ring-[#f4c477] focus-visible:outline-none [&::-webkit-details-marker]:hidden",
              usesDarkHeroNav
                ? "border-white/30 text-white hover:bg-white/10"
                : "border-[#142118]/20 text-[#142118] hover:bg-[#142118]/5",
            )}
          >
            <Menu className="size-4" />
            <span className="sr-only">Open public navigation</span>
          </summary>
          <ul className="absolute top-[calc(100%+0.25rem)] right-0 w-56 overflow-hidden rounded-md border border-[#142118]/10 bg-white/85 p-1 text-sm text-[#142118] shadow-md backdrop-blur-xl">
            {cultivarSearchEnabled ? (
              <li>
                <Link
                  href="/cultivars"
                  aria-current={isCultivarsActive ? "page" : undefined}
                  className={cn(
                    "block rounded-sm px-2 py-1.5 hover:bg-[#142118]/8",
                    isCultivarsActive && activeNavClassName,
                  )}
                >
                  Search cultivars
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/catalogs"
                aria-current={isCatalogsActive ? "page" : undefined}
                className={cn(
                  "block rounded-sm px-2 py-1.5 hover:bg-[#142118]/8",
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
                  "block rounded-sm px-2 py-1.5 hover:bg-[#142118]/8",
                  isGrowersActive && activeNavClassName,
                )}
              >
                For growers
              </Link>
            </li>
            <li className="mt-1 border-t border-[#142118]/10 pt-1">
              <Link
                href={SUBSCRIPTION_CONFIG.DASHBOARD_SIGN_IN_PATH}
                className="block rounded-sm px-2 py-1.5 hover:bg-[#142118]/8"
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

          <form action={SUBSCRIPTION_CONFIG.DASHBOARD_SIGN_IN_PATH}>
            <Button
              className={cn(
                "ml-2 h-10 rounded-md border bg-transparent px-5 text-sm shadow-none disabled:opacity-100",
                usesDarkHeroNav
                  ? "border-white/35 text-white hover:bg-white hover:text-[#142118]"
                  : "border-[#142118]/25 text-[#142118] hover:bg-[#142118] hover:text-white",
              )}
              size="sm"
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
