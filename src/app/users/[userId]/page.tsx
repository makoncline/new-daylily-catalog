"use server";

import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db";

interface UsersLegacyRoutePageProps {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toQueryString(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      params.append(key, value);
      return;
    }

    value?.forEach((entry) => {
      params.append(key, entry);
    });
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export default async function UsersLegacyRoutePage({
  params,
  searchParams,
}: UsersLegacyRoutePageProps) {
  const { userId } = await params;
  const resolvedSearchParams = await searchParams;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const canonicalUserSlug = user.profile?.slug ?? user.id;
  permanentRedirect(`/${canonicalUserSlug}${toQueryString(resolvedSearchParams)}`);
}
