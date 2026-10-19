import type { Metadata } from "next";
import { TempListClient } from "./_components/temp-list-client";

export const metadata: Metadata = {
  title: "Temp list",
  description:
    "Build a temporary flower list and download a spreadsheet or detail cards.",
  robots: { index: false, follow: false },
};

export default function TempListPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-3 py-8 lg:px-8 lg:py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Temp list
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          Collect flowers, add your notes, and download a spreadsheet or
          printable detail cards. Your list is saved in this browser. Nothing is
          published.
        </p>
      </header>
      <TempListClient />
    </div>
  );
}
