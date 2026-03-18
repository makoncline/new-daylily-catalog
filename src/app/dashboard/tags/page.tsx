"use client";

import { TagPrintTable } from "./_components/tag-print-table";
import { PageHeader } from "@/components/page-header";

export default function TagsPage() {
  return (
    <>
      <PageHeader
        heading="Tags"
        text="Select listings, choose tag content and size, then print."
      />

      <TagPrintTable />
    </>
  );
}
