"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  lines?: number;
  className?: string;
  onTruncated?: (isTruncated: boolean) => void;
}

export function TruncatedText({
  text,
  lines = 1,
  className,
  onTruncated,
}: TruncatedTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateTruncation = () => {
      const nextIsTruncated =
        lines === 1
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight;

      setIsTruncated((current) =>
        current === nextIsTruncated ? current : nextIsTruncated,
      );
      onTruncated?.(nextIsTruncated);
    };

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            updateTruncation();
          });

    observer?.observe(element);

    const frameId = window.requestAnimationFrame(updateTruncation);
    const handleResize = () => {
      updateTruncation();
    };

    if (!observer) {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (!observer) {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, [text, lines, onTruncated]);

  if (!text) return null;

  const baseClasses = "w-max max-w-full";
  const truncateClasses =
    lines === 1
      ? "overflow-hidden text-ellipsis whitespace-nowrap"
      : "break-words line-clamp-(--lines)";

  const styleVars =
    lines > 1 ? ({ ["--lines"]: String(lines) } as CSSProperties) : undefined;

  return (
    <div
      ref={ref}
      className={cn(baseClasses, truncateClasses, className)}
      style={styleVars}
      title={isTruncated ? text : undefined}
    >
      {text}
    </div>
  );
}
