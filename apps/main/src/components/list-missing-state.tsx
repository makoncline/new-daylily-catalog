import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
export function ListMissingState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          List not found
        </EmptyTitle>
        <EmptyDescription>This list is no longer available.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" asChild>
          <Link href="/dashboard/lists">Back to lists</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
