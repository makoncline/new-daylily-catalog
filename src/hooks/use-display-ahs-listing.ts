"use client";

import { useMemo } from "react";
import {
  getDisplayAhsListing,
  type AhsDisplaySource,
  type AhsDisplayListing,
} from "@/lib/utils/ahs-display";

export function useDisplayAhsListing(
  source: AhsDisplaySource,
): AhsDisplayListing | null {
  return useMemo(() => getDisplayAhsListing(source), [source]);
}
