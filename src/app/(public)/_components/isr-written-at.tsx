import { Muted } from "@/components/typography";
import { cn } from "@/lib/utils";

interface IsrWrittenAtProps {
  className?: string;
}

const isrWrittenAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

export function IsrWrittenAt({ className }: IsrWrittenAtProps) {
  const writtenAt = new Date();
  const writtenAtIso = writtenAt.toISOString();
  const writtenAtLabel = isrWrittenAtFormatter.format(writtenAt);

  return (
    <Muted className={cn("mt-8 text-center text-xs", className)}>
      <time dateTime={writtenAtIso}>Page cache written {writtenAtLabel} UTC</time>
    </Muted>
  );
}
