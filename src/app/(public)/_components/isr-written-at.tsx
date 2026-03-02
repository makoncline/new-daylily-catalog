import { Muted } from "@/components/typography";
import { cn } from "@/lib/utils";
import { IsrWrittenAtLocalTime } from "./isr-written-at-local-time";

interface IsrWrittenAtProps {
  className?: string;
}

export function IsrWrittenAt({ className }: IsrWrittenAtProps) {
  const writtenAt = new Date();
  const writtenAtIso = writtenAt.toISOString();

  return (
    <Muted className={cn("mt-8 text-center text-xs", className)}>
      <IsrWrittenAtLocalTime writtenAtIso={writtenAtIso} />
    </Muted>
  );
}
