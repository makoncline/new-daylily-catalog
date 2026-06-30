import Link from "next/link";
import { Flower2 } from "lucide-react";
import { PublicFeedbackLink } from "@/components/public-feedback-link";
import { SellerIntentLink } from "@/components/seller-intent-link";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-[#d8dfd2] bg-[#fbfaf4] px-4 py-8 text-[#142118] lg:px-8">
      <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-6 text-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-semibold hover:opacity-80"
          >
            <Flower2 className="size-5 text-[#a94e38]" />
            <span className="text-base">Daylily Catalog</span>
          </Link>
          <p className="mt-2 leading-6 text-[#536357]">
            Browse daylily catalogs created by growers.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
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

          <PublicFeedbackLink className="text-xs font-medium text-[#6f7c72] underline-offset-4 transition-colors hover:text-[#142118] hover:underline">
            Feedback
          </PublicFeedbackLink>
        </div>
      </div>
    </footer>
  );
}
