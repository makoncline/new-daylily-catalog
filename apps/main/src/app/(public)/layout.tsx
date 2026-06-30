import { PublicHeader } from "@/components/public-nav";
import { type Metadata } from "next";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { PublicFooter } from "@/components/public-footer";
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
      <PublicFooter />
    </div>
  );
}
