"use client";

import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-nav";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface PublicShellProps {
  children: React.ReactNode;
  cultivarSearchEnabled?: boolean;
  mainClassName?: string;
}

export function PublicShell({
  children,
  cultivarSearchEnabled = false,
  mainClassName,
}: PublicShellProps) {
  const pathname = usePathname();
  const overlapsHero =
    pathname === "/" ||
    pathname === "/start-membership" ||
    pathname === "/cultivars";
  const shellBackgroundClassName =
    pathname === "/start-membership" || pathname === "/cultivars"
      ? "bg-[#07120e]"
      : pathname === "/"
        ? "bg-[#f1f4ec]"
        : "bg-[#f6f8f3]";

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col text-[#142118]",
        shellBackgroundClassName,
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-[#142118] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <PublicHeader cultivarSearchEnabled={cultivarSearchEnabled} />
      <main
        id="main-content"
        className={cn(
          "w-full flex-1 scroll-mt-4 overflow-hidden [&_[id]]:scroll-mt-4",
          overlapsHero && "-mt-16 lg:-mt-20",
          mainClassName,
        )}
      >
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
