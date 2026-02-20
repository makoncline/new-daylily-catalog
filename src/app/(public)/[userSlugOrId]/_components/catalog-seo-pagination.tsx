"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicProfilePaginationHref } from "@/lib/public-catalog-url-state";
import { Muted, P } from "@/components/typography";

interface CatalogSeoPaginationProps {
  canonicalUserSlug: string;
  page: number;
  totalPages: number;
  anchor?: string;
  goToPageTestId?: string;
  prevTestId?: string;
  indicatorTestId?: string;
  nextTestId?: string;
}

export interface CatalogSeoPaginationViewProps {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
  pageOptions: string[];
  onGoToPage: (value: string) => void;
  goToPageTestId?: string;
  prevTestId?: string;
  indicatorTestId?: string;
  nextTestId?: string;
}

export function useCatalogSeoPaginationViewProps({
  canonicalUserSlug,
  page,
  totalPages,
  anchor = "listings",
  goToPageTestId,
  prevTestId,
  indicatorTestId,
  nextTestId,
}: CatalogSeoPaginationProps): CatalogSeoPaginationViewProps {
  const router = useRouter();
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const pageOptions = Array.from({ length: totalPages }, (_, index) =>
    String(index + 1),
  );
  const prevHref = getPublicProfilePaginationHref(
    canonicalUserSlug,
    prevPage,
    anchor,
  );
  const nextHref = getPublicProfilePaginationHref(
    canonicalUserSlug,
    nextPage,
    anchor,
  );

  const goToPage = (value: string) => {
    const nextSelectedPage = Number.parseInt(value, 10);
    if (!Number.isFinite(nextSelectedPage) || nextSelectedPage === page) {
      return;
    }

    void router.push(
      getPublicProfilePaginationHref(canonicalUserSlug, nextSelectedPage, anchor),
      {
        scroll: true,
      },
    );
  };

  return {
    page,
    totalPages,
    prevHref,
    nextHref,
    pageOptions,
    onGoToPage: goToPage,
    goToPageTestId,
    prevTestId,
    indicatorTestId,
    nextTestId,
  };
}

export function CatalogSeoPaginationView({
  page,
  totalPages,
  prevHref,
  nextHref,
  pageOptions,
  onGoToPage,
  goToPageTestId,
  prevTestId,
  indicatorTestId,
  nextTestId,
}: CatalogSeoPaginationViewProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <P className="text-sm font-medium">Page</P>
      <ClientOnly
        fallback={
          <Button
            type="button"
            variant="outline"
            className="h-8 w-fit min-w-[3.5rem] px-3"
            data-testid={goToPageTestId}
            disabled
          >
            {page}
          </Button>
        }
      >
        <Select value={String(page)} onValueChange={onGoToPage}>
          <SelectTrigger
            className="h-8 w-fit min-w-[3.5rem]"
            data-testid={goToPageTestId}
          >
            <SelectValue placeholder={page} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageOptions.map((pageNumber) => (
              <SelectItem key={pageNumber} value={pageNumber}>
                {pageNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ClientOnly>

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

export function CatalogSeoPagination({
  ...props
}: CatalogSeoPaginationProps) {
  const viewProps = useCatalogSeoPaginationViewProps(props);

  return <CatalogSeoPaginationView {...viewProps} />;
}
