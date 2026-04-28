import type { TrackPublicIsrPathInvalidationInput, TrackPublicIsrTagInvalidationInput } from "@/server/analytics/public-isr-posthog";

export type PublicIsrTagProfile = "expire:0" | "max";

export interface PublicIsrPathInput {
  path: string;
  type?: "page" | "layout";
}

export interface PublicIsrTagInput {
  profile?: PublicIsrTagProfile;
  tag: string;
}

export interface PublicIsrPlan {
  paths: PublicIsrPathInput[];
  source: string;
  tags: PublicIsrTagInput[];
}

export interface PublicIsrExecutionHandlers {
  revalidatePath: (path: string, type?: "page" | "layout") => boolean;
  revalidateTag: (tag: string, profile: "max" | { expire: 0 }) => boolean;
  trackPathInvalidation: (
    input: TrackPublicIsrPathInvalidationInput,
  ) => void;
  trackTagInvalidation: (input: TrackPublicIsrTagInvalidationInput) => void;
}

export interface ExecutePublicIsrPlanArgs {
  handlers: PublicIsrExecutionHandlers;
  plan: PublicIsrPlan;
  sourcePage: string;
  transport: "direct" | "internal-route";
}

export const PUBLIC_ISR_DEFAULT_TAG_PROFILE: PublicIsrTagProfile = "expire:0";

function normalizePublicIsrTagProfile(
  profile: PublicIsrTagProfile | undefined,
): PublicIsrTagProfile {
  return profile ?? PUBLIC_ISR_DEFAULT_TAG_PROFILE;
}

export function toNextTagProfile(profile: PublicIsrTagProfile): "max" | { expire: 0 } {
  return profile === "max" ? "max" : ({ expire: 0 } as const);
}

function toUniquePathInputs(
  paths: PublicIsrPathInput[],
): PublicIsrPathInput[] {
  const byKey = new Map<string, PublicIsrPathInput>();

  paths.forEach((entry) => {
    const key = `${entry.type ?? "default"}:${entry.path}`;
    byKey.set(key, entry);
  });

  return Array.from(byKey.values());
}

function toUniqueTagInputs(tags: PublicIsrTagInput[]): PublicIsrTagInput[] {
  const byKey = new Map<string, PublicIsrTagInput>();

  tags.forEach((entry) => {
    const profile = normalizePublicIsrTagProfile(entry.profile);
    const key = `${profile}:${entry.tag}`;
    byKey.set(key, {
      ...entry,
      profile,
    });
  });

  return Array.from(byKey.values());
}

export function createPublicIsrPlan(input: {
  paths: PublicIsrPathInput[];
  source: string;
  tags?: PublicIsrTagInput[];
}): PublicIsrPlan {
  return {
    paths: toUniquePathInputs(input.paths),
    source: input.source,
    tags: toUniqueTagInputs(input.tags ?? []),
  };
}

export function executePublicIsrPlan({
  handlers,
  plan,
  sourcePage,
  transport,
}: ExecutePublicIsrPlanArgs): void {
  plan.tags.forEach((entry) => {
    const profile = normalizePublicIsrTagProfile(entry.profile);
    if (handlers.revalidateTag(entry.tag, toNextTagProfile(profile))) {
      handlers.trackTagInvalidation({
        profile,
        sourcePage,
        tag: entry.tag,
        transport,
        triggerSource: plan.source,
      });
    }
  });

  plan.paths.forEach((entry) => {
    if (handlers.revalidatePath(entry.path, entry.type)) {
      handlers.trackPathInvalidation({
        path: entry.path,
        sourcePage,
        transport,
        triggerSource: plan.source,
        type: entry.type,
      });
    }
  });
}
