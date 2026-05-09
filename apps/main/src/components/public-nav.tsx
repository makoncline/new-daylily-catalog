"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flower2 } from "lucide-react";
import { Small } from "@/components/typography";
import { DashboardButton } from "@/components/dashboard-button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type PublicNavTheme = "light" | "dark";

function getNavThemeClasses(theme: PublicNavTheme) {
  return {
    brand: theme === "dark" ? "text-white" : "text-[#142118]",
    logo: theme === "dark" ? "text-[#f4c477]" : "text-[#173126]",
    link:
      theme === "dark"
        ? "text-white hover:bg-white/10 hover:text-white"
        : "text-[#142118] hover:bg-[#e9efe3] hover:text-[#142118]",
    active: theme === "dark" ? "bg-white/10 text-white" : "bg-[#e9efe3]",
    dashboard:
      theme === "dark"
        ? "ml-2 h-10 rounded-md border border-white/25 bg-transparent px-5 text-sm text-white shadow-none hover:bg-white hover:text-[#07120e] disabled:opacity-100"
        : "ml-2 h-10 rounded-md border border-[#c8d4c1] bg-white px-5 text-sm text-[#142118] shadow-none hover:bg-[#173126] hover:text-white disabled:opacity-100",
    mobileDashboard:
      theme === "dark"
        ? "h-9 rounded-lg bg-white px-3 text-xs text-[#07120e] shadow-none hover:bg-[#f4c477] disabled:opacity-100"
        : "h-9 rounded-lg bg-[#173126] px-3 text-xs text-white shadow-none hover:bg-[#274835] disabled:opacity-100",
  };
}

export function PublicHeader() {
  const pathname = usePathname();
  const isHeroOverlayPage = pathname === "/" || pathname === "/start-membership";
  const theme = isHeroOverlayPage ? "dark" : "light";

  return (
    <header
      className={cn(
        "z-50 flex w-full items-center px-3 py-1 backdrop-blur-xl lg:px-8",
        isHeroOverlayPage
          ? "fixed inset-x-0 top-0 border-none bg-black/6"
          : "min-h-20 border-b border-[#d8dfd2] bg-[#fbfaf4]/92 lg:h-20 lg:py-0",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          isHeroOverlayPage ? "max-w-[1024px]" : "max-w-[1600px]",
        )}
      >
        <PublicdNav theme={theme} />
      </div>
    </header>
  );
}

export function PublicdNav({ theme = "light" }: { theme?: PublicNavTheme }) {
  const pathname = usePathname();
  const isHeroOverlayPage = pathname === "/" || pathname === "/start-membership";
  const isCatalogsActive = pathname === "/catalogs";
  const classes = getNavThemeClasses(theme);

  return (
    <nav className="flex w-full items-center justify-between gap-2 py-1 lg:gap-4">
      <Link
        href="/"
        className={cn(
          "flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-[#f4c477] focus-visible:outline-none lg:gap-3",
          classes.brand,
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center lg:h-8 lg:w-8",
            classes.logo,
          )}
        >
          <Flower2 className="h-5 w-5 lg:h-6 lg:w-6" />
        </span>
        <Small
          className={cn(
            "text-xs leading-none font-semibold whitespace-nowrap min-[390px]:text-sm lg:text-base",
            classes.brand,
          )}
        >
          Daylily Catalog
        </Small>
      </Link>

      <div
        className={cn(
          "min-w-0 flex-1 items-center justify-center gap-1 lg:hidden",
          isHeroOverlayPage ? "hidden" : "flex",
        )}
      >
        <Button
          variant="ghost"
          asChild
          size="sm"
          className={cn(
            "h-8 px-1 text-[10.5px] whitespace-nowrap min-[390px]:px-1.5 min-[390px]:text-[11px]",
            classes.link,
            isCatalogsActive && classes.active,
          )}
        >
          <Link href="/catalogs">Browse catalogs</Link>
        </Button>

        <Button
          variant="ghost"
          asChild
          size="sm"
          className={cn(
            "h-8 px-1 text-[10.5px] whitespace-nowrap min-[390px]:px-1.5 min-[390px]:text-[11px]",
            classes.link,
          )}
        >
          <Link href="/start-membership">For growers</Link>
        </Button>
      </div>

      <div className="shrink-0 lg:hidden">
        <DashboardButton className={classes.mobileDashboard} />
      </div>

      <div className="hidden items-center gap-4 lg:ml-auto lg:flex">
        <Button
          variant="ghost"
          asChild
          size="sm"
          className={cn(
            "text-base",
            classes.link,
            isCatalogsActive && classes.active,
          )}
        >
          <Link href="/catalogs">Browse catalogs</Link>
        </Button>

        <Button
          variant="ghost"
          asChild
          size="sm"
          className={cn("text-base", classes.link)}
        >
          <Link href="/start-membership">For growers</Link>
        </Button>

        <DashboardButton className={classes.dashboard} />
      </div>
    </nav>
  );
}
