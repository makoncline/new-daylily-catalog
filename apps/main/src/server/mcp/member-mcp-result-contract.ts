import { z } from "zod";
import {
  memberImageResultSchema,
  memberListingResultSchema,
  memberListResultSchema,
  memberProfileResultSchema,
} from "@/lib/member-result-contract";

export const memberMcpWriteResultSchemas = {
  listing: memberListingResultSchema.strip(),
  list: memberListResultSchema.strip(),
  profile: memberProfileResultSchema
    .pick({
      id: true,
      title: true,
      slug: true,
      description: true,
      location: true,
      updatedAt: true,
    })
    .strip(),
};

export const memberMcpProfileResultSchema = memberProfileResultSchema
  .omit({ logoUrl: true })
  .strip()
  .extend({
    images: z.array(memberImageResultSchema.strip()),
    imagesHasMore: z.boolean(),
  })
  .nullable();

export function serializeMemberMcpWriteResult(
  kind: keyof typeof memberMcpWriteResultSchemas,
  record: { updatedAt: Date },
) {
  return memberMcpWriteResultSchemas[kind].parse({
    ...record,
    updatedAt: record.updatedAt.toISOString(),
  });
}
