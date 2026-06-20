import type { Prisma } from "@prisma/client";
import type { ImageType } from "@/types/image";
import { buildR2PublicUrl } from "@/server/services/image-asset-storage";

export interface UserImageOwner {
  type: ImageType;
  referenceId: string;
}

export function getUserImageOwnerWhere(owner: UserImageOwner) {
  return owner.type === "listing"
    ? { listingId: owner.referenceId }
    : { userProfileId: owner.referenceId };
}

export function getListingIdForImageAsset(owner: UserImageOwner) {
  return owner.type === "listing" ? owner.referenceId : null;
}

export async function createUserImageRecord(args: {
  db: Prisma.TransactionClient;
  imageId?: string;
  order: number;
  owner: UserImageOwner;
  r2OriginalKey?: string | null;
  r2OriginalUrl?: string | null;
  status?: string;
  url: string;
}) {
  const ownerWhere = getUserImageOwnerWhere(args.owner);
  const created = await args.db.image.create({
    data: {
      ...(args.imageId ? { id: args.imageId } : {}),
      url: args.url,
      order: args.order,
      ...(args.status ? { status: args.status } : {}),
      ...ownerWhere,
    },
  });

  if (args.r2OriginalKey) {
    await args.db.imageAsset.create({
      data: {
        id: created.id,
        legacyImageId: created.id,
        kind: args.owner.type,
        order: args.order,
        status: "pending_variants",
        originalKey: args.r2OriginalKey,
        originalUrl: args.r2OriginalUrl ?? buildR2PublicUrl(args.r2OriginalKey),
        ...ownerWhere,
      },
    });
  }

  return created;
}
