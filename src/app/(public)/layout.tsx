import { PublicdNav } from "@/components/public-nav";
import { H1 } from "@/components/typography";
import { type Metadata } from "next";
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
    </div>
  );
}
