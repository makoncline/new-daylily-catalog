import { PublicdNav } from "@/components/public-nav";
import { type Metadata } from "next";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-4">
        <PublicdNav />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between text-sm">
          <p className="text-muted-foreground">Daylily Catalog</p>
          <SellerIntentLink
            className="underline"
            entrySurface="public_footer"
            ctaId="public-footer-create-catalog"
            ctaLabel="Create your catalog"
          >
            Create your catalog
          </SellerIntentLink>
        </div>
      </footer>
    </div>
  );
}
