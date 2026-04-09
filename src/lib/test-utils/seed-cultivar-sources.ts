import type { PrismaClient } from "@prisma/client";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";

interface UpsertCultivarReferenceWithV2Input {
  db: PrismaClient;
  ahsId: string;
  name: string | null | undefined;
  hybridizer?: string | null;
  year?: string | null;
  scapeHeight?: string | null;
  bloomSize?: string | null;
  bloomSeason?: string | null;
  ploidy?: string | null;
  foliageType?: string | null;
  bloomHabit?: string | null;
  color?: string | null;
  parentage?: string | null;
  fragrance?: string | null;
  budcount?: string | null;
  branches?: string | null;
  ahsImageUrl?: string | null;
  v2AhsCultivarId?: string;
  v2PostId?: string | null;
  v2IntroductionDate?: string | null;
  v2LastUpdated?: string | null;
}

export interface SeedAhsListingInput {
  db: PrismaClient;
  id?: string;
  name: string;
  hybridizer?: string;
  year?: string;
  scapeHeight?: string;
  bloomSize?: string;
  bloomSeason?: string;
  ploidy?: string;
  foliageType?: string;
  bloomHabit?: string;
  budcount?: string;
  branches?: string;
  color?: string;
  form?: string;
  parentage?: string;
  ahsImageUrl?: string;
  fragrance?: string;
  sculpting?: string;
  foliage?: string;
  flower?: string;
  v2AhsCultivarId?: string;
  v2PostId?: string;
  v2IntroductionDate?: string;
  v2LastUpdated?: string;
}

function parseNumericString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /-?\d+(\.\d+)?/.exec(value);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /-?\d+/.exec(value);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIntroductionDate(
  explicitDate: string | null | undefined,
  year: string | null | undefined,
) {
  if (explicitDate) {
    return explicitDate;
  }

  if (year && /^\d{4}$/.test(year)) {
    return `${year}-01-01`;
  }

  return null;
}

function toLastUpdated(value: string | null | undefined) {
  if (value) {
    return value;
  }

  return "2026-04-01 12:00:00";
}

export async function upsertCultivarReferenceWithV2({
  db,
  ahsId,
  name,
  hybridizer,
  year,
  scapeHeight,
  bloomSize,
  bloomSeason,
  ploidy,
  foliageType,
  bloomHabit,
  color,
  parentage,
  fragrance,
  budcount,
  branches,
  ahsImageUrl,
  v2AhsCultivarId,
  v2PostId,
  v2IntroductionDate,
  v2LastUpdated,
}: UpsertCultivarReferenceWithV2Input) {
  const normalizedName = normalizeCultivarName(name);
  const resolvedV2AhsCultivarId = v2AhsCultivarId ?? `v2-${ahsId}`;
  const resolvedV2PostId = v2PostId ?? `post-${ahsId}`;
  const introductionDate = toIntroductionDate(v2IntroductionDate, year);
  const imageUrl = ahsImageUrl ?? null;

  const v2AhsCultivar = await db.v2AhsCultivar.upsert({
    where: { id: resolvedV2AhsCultivarId },
    update: {
      post_id: resolvedV2PostId,
      link_normalized_name: normalizedName,
      post_title: name,
      post_status: "publish",
      introduction_date: introductionDate,
      primary_hybridizer_name: hybridizer ?? null,
      bloom_season_names: bloomSeason ?? null,
      fragrance_names: fragrance ?? null,
      bloom_habit_names: bloomHabit ?? null,
      foliage_names: foliageType ?? null,
      ploidy_names: ploidy ?? null,
      scape_height_in: parseNumericString(scapeHeight),
      bloom_size_in: parseNumericString(bloomSize),
      bud_count: parseIntegerString(budcount),
      branches: parseIntegerString(branches),
      color: color ?? null,
      parentage: parentage ?? null,
      images_count: imageUrl ? 1 : 0,
      last_updated: toLastUpdated(v2LastUpdated),
      image_url: imageUrl,
    },
    create: {
      id: resolvedV2AhsCultivarId,
      post_id: resolvedV2PostId,
      link_normalized_name: normalizedName,
      post_title: name,
      post_status: "publish",
      introduction_date: introductionDate,
      primary_hybridizer_name: hybridizer ?? null,
      bloom_season_names: bloomSeason ?? null,
      fragrance_names: fragrance ?? null,
      bloom_habit_names: bloomHabit ?? null,
      foliage_names: foliageType ?? null,
      ploidy_names: ploidy ?? null,
      scape_height_in: parseNumericString(scapeHeight),
      bloom_size_in: parseNumericString(bloomSize),
      bud_count: parseIntegerString(budcount),
      branches: parseIntegerString(branches),
      color: color ?? null,
      parentage: parentage ?? null,
      images_count: imageUrl ? 1 : 0,
      last_updated: toLastUpdated(v2LastUpdated),
      image_url: imageUrl,
    },
  });

  const cultivarReference = await db.cultivarReference.upsert({
    where: { ahsId },
    update: {
      normalizedName,
      v2AhsCultivarId: v2AhsCultivar.id,
    },
    create: {
      id: `cr-ahs-${ahsId}`,
      ahsId,
      v2AhsCultivarId: v2AhsCultivar.id,
      normalizedName,
    },
  });

  return {
    cultivarReference,
    v2AhsCultivar,
  };
}

export async function seedAhsListing({
  db,
  id,
  name,
  hybridizer,
  year,
  scapeHeight,
  bloomSize,
  bloomSeason,
  ploidy,
  foliageType,
  bloomHabit,
  budcount,
  branches,
  color,
  form,
  parentage,
  ahsImageUrl,
  fragrance,
  sculpting,
  foliage,
  flower,
  v2AhsCultivarId,
  v2PostId,
  v2IntroductionDate,
  v2LastUpdated,
}: SeedAhsListingInput) {
  const ahsListing = id
    ? await db.ahsListing.upsert({
        where: { id },
        update: {
          name,
          hybridizer,
          year,
          scapeHeight,
          bloomSize,
          bloomSeason,
          ploidy,
          foliageType,
          bloomHabit,
          budcount,
          branches,
          color,
          form,
          parentage,
          ahsImageUrl,
          fragrance,
          sculpting,
          foliage,
          flower,
        },
        create: {
          id,
          name,
          hybridizer,
          year,
          scapeHeight,
          bloomSize,
          bloomSeason,
          ploidy,
          foliageType,
          bloomHabit,
          budcount,
          branches,
          color,
          form,
          parentage,
          ahsImageUrl,
          fragrance,
          sculpting,
          foliage,
          flower,
        },
      })
    : await db.ahsListing.create({
        data: {
          name,
          hybridizer,
          year,
          scapeHeight,
          bloomSize,
          bloomSeason,
          ploidy,
          foliageType,
          bloomHabit,
          budcount,
          branches,
          color,
          form,
          parentage,
          ahsImageUrl,
          fragrance,
          sculpting,
          foliage,
          flower,
        },
      });

  const { cultivarReference, v2AhsCultivar } = await upsertCultivarReferenceWithV2({
    db,
    ahsId: ahsListing.id,
    name: ahsListing.name ?? name,
    hybridizer: ahsListing.hybridizer,
    year: ahsListing.year,
    scapeHeight: ahsListing.scapeHeight,
    bloomSize: ahsListing.bloomSize,
    bloomSeason: ahsListing.bloomSeason,
    ploidy: ahsListing.ploidy,
    foliageType: ahsListing.foliageType,
    bloomHabit: ahsListing.bloomHabit,
    color: ahsListing.color,
    parentage: ahsListing.parentage,
    fragrance: ahsListing.fragrance,
    budcount: ahsListing.budcount,
    branches: ahsListing.branches,
    ahsImageUrl: ahsListing.ahsImageUrl,
    v2AhsCultivarId,
    v2PostId,
    v2IntroductionDate,
    v2LastUpdated,
  });

  return {
    ahsListing,
    cultivarReferenceId: cultivarReference.id,
    v2AhsCultivarId: v2AhsCultivar.id,
  };
}
