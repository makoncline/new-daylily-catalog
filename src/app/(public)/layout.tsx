import { PublicdNav } from "@/components/public-nav";
import { H1 } from "@/components/typography";
import { env } from "@/env";
import { type Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-4">
        <div className="flex-1">
          <H1 className="text-xl">Daylily Catalog</H1>
        </div>
        <PublicdNav />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
