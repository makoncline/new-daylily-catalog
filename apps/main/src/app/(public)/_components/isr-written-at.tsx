import {
  type TrackPublicIsrPageGenerationInput,
  trackPublicIsrPageGeneration,
} from "@/server/analytics/public-isr-posthog";

interface IsrWrittenAtProps extends TrackPublicIsrPageGenerationInput {
  className?: string;
}

export function IsrWrittenAt({
  routePath,
  routeType,
}: IsrWrittenAtProps) {
  trackPublicIsrPageGeneration({
    routePath,
    routeType,
  });

  return null;
}
