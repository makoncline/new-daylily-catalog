import type { ReactNode } from "react";

export default function CatalogImporterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      data-slot="catalog-importer-page"
      className="bg-background flex min-w-0 flex-1 flex-col [&:has([data-workbook-active=true])_[data-importer-upload-copy]]:hidden"
    >
      <div
        data-slot="catalog-importer-page-container"
        className="mx-auto w-full max-w-[1024px]"
      >
        {children}
      </div>
    </div>
  );
}
