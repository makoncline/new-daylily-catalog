"use client";

import { PageHeader } from "../_components/page-header";
import { TagPrintTable } from "./_components/tag-print-table";

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
