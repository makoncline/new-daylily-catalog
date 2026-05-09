import { PublicHeader } from "@/components/public-nav";
import { type Metadata } from "next";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import Link from "next/link";
import { Flower2 } from "lucide-react";
export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalBaseUrl()),
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#f6f8f3] text-[#142118]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#142118] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="w-full flex-1 overflow-hidden">
        {children}
      </main>
      <footer className="w-full border-t border-[#d8dfd2] bg-[#fbfaf4] px-4 py-8 text-[#142118] lg:px-8">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 text-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-semibold hover:opacity-80"
            >
              <Flower2 className="h-5 w-5 text-[#a94e38]" />
              <span className="text-base">Daylily Catalog</span>
            </Link>
            <p className="mt-2 leading-6 text-[#536357]">
              Browse daylily catalogs created by growers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <Link
              href="/catalogs"
              className="inline-flex h-10 items-center border border-[#d8dfd2] bg-white px-4 text-[#142118] transition-colors hover:border-[#173126] hover:bg-[#173126] hover:text-white"
            >
              Browse catalogs
            </Link>
            <SellerIntentLink
              className="inline-flex h-10 items-center border border-[#d8dfd2] bg-white px-4 text-[#142118] transition-colors hover:border-[#173126] hover:bg-[#173126] hover:text-white"
              entrySurface="public_footer"
              ctaId="public-footer-create-catalog"
              ctaLabel="Create your catalog"
            >
              Create your catalog
            </SellerIntentLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
