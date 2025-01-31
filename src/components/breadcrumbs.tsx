"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TruncatedText } from "./truncated-text";

export interface BreadcrumbItemType {
  title: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemType[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={item.href ?? item.title}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href} className="w-full max-w-40">
                  <TruncatedText text={item.title} />
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="w-full max-w-40">
                  <TruncatedText text={item.title} />
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
