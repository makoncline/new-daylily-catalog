import type { Prisma } from "@prisma/client";

export function textContains(value: string): Prisma.StringFilter {
  return { contains: value };
}

export function linkedCultivarWhere(
  where: Prisma.CultivarReferenceWhereInput,
): Prisma.ListingWhereInput {
  return { cultivarReference: { is: where } };
}

export function ahsListingWhere(where: Prisma.AhsListingWhereInput) {
  return [
    { ahsListing: { is: where } },
    linkedCultivarWhere({ ahsListing: { is: where } }),
  ] satisfies Prisma.ListingWhereInput[];
}

export function v2CultivarWhere(
  where: Prisma.V2AhsCultivarWhereInput,
): Prisma.ListingWhereInput {
  return linkedCultivarWhere({ v2AhsCultivar: { is: where } });
}

export function cultivarNameWhere(value: string) {
  const contains = textContains(value);

  return [
    { ahsListing: { is: { name: contains } } },
    linkedCultivarWhere({
      OR: [
        { normalizedName: contains },
        { ahsListing: { is: { name: contains } } },
        {
          v2AhsCultivar: {
            is: {
              OR: [
                { post_title: contains },
                { link_normalized_name: contains },
              ],
            },
          },
        },
      ],
    }),
  ] satisfies Prisma.ListingWhereInput[];
}

export function hybridizerWhere(value: string) {
  const contains = textContains(value);

  return [
    { ahsListing: { is: { hybridizer: contains } } },
    linkedCultivarWhere({
      OR: [
        { ahsListing: { is: { hybridizer: contains } } },
        {
          v2AhsCultivar: {
            is: {
              OR: [
                { primary_hybridizer_name: contains },
                { additional_hybridizers_names: contains },
                { hybridizer_code_legacy: contains },
              ],
            },
          },
        },
      ],
    }),
  ] satisfies Prisma.ListingWhereInput[];
}

export function cultivarTextWhere(args: {
  ahsField: keyof Prisma.AhsListingWhereInput;
  v2Field: keyof Prisma.V2AhsCultivarWhereInput;
  value: string;
}) {
  const contains = textContains(args.value);

  return [
    ...ahsListingWhere({ [args.ahsField]: contains }),
    v2CultivarWhere({ [args.v2Field]: contains }),
  ] satisfies Prisma.ListingWhereInput[];
}
