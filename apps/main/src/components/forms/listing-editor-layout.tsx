import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";

export function ListingEditorLayout({
  children,
  backAction,
  notice,
  description,
}: {
  children: ReactNode;
  backAction: ReactNode;
  notice?: ReactNode;
  description?: string;
}) {
  return (
    <section
      aria-label="Edit listing"
      className="mx-auto w-full max-w-3xl pb-8"
    >
      {notice}
      <PageHeader heading="Edit Listing" text={description}>
        {backAction}
      </PageHeader>
      {children}
    </section>
  );
}
