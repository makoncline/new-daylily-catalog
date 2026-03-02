"use client";

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
  const writtenAtLabel = isrWrittenAtLocalFormatter.format(
    new Date(writtenAtIso),
  );

  return (
    <time dateTime={writtenAtIso} suppressHydrationWarning>
      {`last updated ${writtenAtLabel} (in your local time)`}
    </time>
  );
}
