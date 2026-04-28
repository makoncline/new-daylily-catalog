"use client";

export const DASHBOARD_DB_QUERY_KEYS = {
  root: ["dashboard-db"] as const,
  listings: ["dashboard-db", "listings"] as const,
  lists: ["dashboard-db", "lists"] as const,
  images: ["dashboard-db", "images"] as const,
  cultivarReferences: ["dashboard-db", "cultivar-references"] as const,
} as const;

export const DASHBOARD_DB_CURSOR_BASES = {
  listings: "dashboard-db:listings:maxUpdatedAt",
  lists: "dashboard-db:lists:maxUpdatedAt",
  images: "dashboard-db:images:maxUpdatedAt",
  cultivarReferences: "dashboard-db:cultivar-references:maxUpdatedAt",
} as const;
