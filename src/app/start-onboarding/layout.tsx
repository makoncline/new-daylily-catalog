import { PublicdNav } from "@/components/public-nav";

export default function StartOnboardingLayout({
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
