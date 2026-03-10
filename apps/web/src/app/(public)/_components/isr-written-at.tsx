import { Muted } from "@/components/typography";
import { cn } from "@/lib/utils";
import {
  type TrackPublicIsrPageGenerationInput,
  trackPublicIsrPageGeneration,
} from "@/server/analytics/public-isr-posthog";
import { IsrWrittenAtLocalTime } from "./isr-written-at-local-time";

interface IsrWrittenAtProps extends TrackPublicIsrPageGenerationInput {
  className?: string;
}

export function IsrWrittenAt({
  className,
  routePath,
  routeType,
}: IsrWrittenAtProps) {
  const writtenAt = new Date();
  const writtenAtIso = writtenAt.toISOString();
  trackPublicIsrPageGeneration({
    routePath,
    routeType,
  });

  return (
    <Muted className={cn("mt-8 text-center text-xs", className)}>
      <IsrWrittenAtLocalTime writtenAtIso={writtenAtIso} />
    </Muted>
  );
}
