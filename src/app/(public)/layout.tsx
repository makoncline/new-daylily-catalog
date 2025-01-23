"use server";

import { DashboardNav } from "@/components/dashboard-nav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Daylily Catalog</h1>
        </div>
        <DashboardNav />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
