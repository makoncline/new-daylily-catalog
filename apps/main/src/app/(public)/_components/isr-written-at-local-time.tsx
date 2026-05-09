"use client";

import { useIsHydrated } from "@/hooks/use-is-hydrated";

interface IsrWrittenAtLocalTimeProps {
  writtenAtIso: string;
}

const isrWrittenAtLocalFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export function IsrWrittenAtLocalTime({
  writtenAtIso,
}: IsrWrittenAtLocalTimeProps) {
  const isHydrated = useIsHydrated();
  if (!isHydrated) {
    return <time dateTime={writtenAtIso}>Last updated</time>;
  }

  const writtenAtLabel = isrWrittenAtLocalFormatter.format(
    new Date(writtenAtIso),
  );

  return <time dateTime={writtenAtIso}>{`Last updated ${writtenAtLabel}`}</time>;
}
