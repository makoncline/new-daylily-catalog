import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface ServerBreadcrumbItem {
  title: string;
  href?: string;
}

interface ServerBreadcrumbsProps {
  items: readonly ServerBreadcrumbItem[];
  className?: string;
}

function ServerBreadcrumbText({ title }: { title: string }) {
  return (
    <span className="block w-full max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
      {title}
    </span>
  );
}

export function ServerBreadcrumbs({
  items,
  className,
}: ServerBreadcrumbsProps) {
  return (
    <nav aria-label="breadcrumb" className={className}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5">
        {items.map((item, index) => (
          <Fragment key={item.href ?? item.title}>
            <li className="inline-flex items-center gap-1.5">
              {item.href ? (
                <Link
                  className="hover:text-foreground transition-colors"
                  href={item.href}
                  prefetch={false}
                >
                  <ServerBreadcrumbText title={item.title} />
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="text-foreground font-normal"
                >
                  <ServerBreadcrumbText title={item.title} />
                </span>
              )}
            </li>

            {index < items.length - 1 ? (
              <li
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground",
                  "[&>svg]:h-3.5 [&>svg]:w-3.5",
                )}
                role="presentation"
              >
                <ChevronRight />
              </li>
            ) : null}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
