"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicProfilePagePath } from "@/lib/public-catalog-url-state";
import { Muted, P } from "@/components/typography";

interface CatalogSeoPaginationProps {
  canonicalUserSlug: string;
  page: number;
  totalPages: number;
  goToPageTestId?: string;
  prevTestId?: string;
  indicatorTestId?: string;
  nextTestId?: string;
}

function getPaginationHref(canonicalUserSlug: string, page: number) {
  return `${getPublicProfilePagePath(canonicalUserSlug, page)}#listings`;
}

export function CatalogSeoPagination({
  canonicalUserSlug,
  page,
  totalPages,
  goToPageTestId,
  prevTestId,
  indicatorTestId,
  nextTestId,
}: CatalogSeoPaginationProps) {
  const router = useRouter();
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const prevHref = getPaginationHref(canonicalUserSlug, prevPage);
  const nextHref = getPaginationHref(canonicalUserSlug, nextPage);

  const handleGoToPage = React.useCallback(
    (value: string) => {
      const nextSelectedPage = Number.parseInt(value, 10);
      if (!Number.isFinite(nextSelectedPage) || nextSelectedPage === page) {
        return;
      }

      void router.push(getPaginationHref(canonicalUserSlug, nextSelectedPage), {
        scroll: true,
      });
    },
    [canonicalUserSlug, page, router],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <P className="text-sm font-medium">Page</P>
      <Select value={String(page)} onValueChange={handleGoToPage}>
        <SelectTrigger
          className="h-8 w-fit min-w-[3.5rem]"
          data-testid={goToPageTestId}
        >
          <SelectValue placeholder={page} />
        </SelectTrigger>
        <SelectContent side="top">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <SelectItem key={pageNumber} value={String(pageNumber)}>
                {pageNumber}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Muted className="text-sm" data-testid={indicatorTestId}>
        of {totalPages}
      </Muted>

      <div className="flex items-center space-x-2">
        <Button
          asChild
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page <= 1}
          data-testid={prevTestId}
        >
          <Link href={prevHref}>
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page >= totalPages}
          data-testid={nextTestId}
        >
          <Link href={nextHref}>
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
