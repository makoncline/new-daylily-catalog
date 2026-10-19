"use client";

/* eslint-disable @next/next/no-img-element -- The preview uses the exact OG image URL. */
import { useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCultivarShareImagePath } from "@/lib/social-card";

export function CultivarShareImageButton({
  cultivarName,
  segment,
  compact = false,
}: {
  cultivarName: string;
  segment: string;
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<"dark" | "light">("dark");
  const darkUrl = getCultivarShareImagePath(segment);
  const lightUrl = getCultivarShareImagePath(segment, "print");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "default"}
          title={`View share image for ${cultivarName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <ImageIcon className="size-4" />
          {compact ? (
            <span className="sr-only">View share image for {cultivarName}</span>
          ) : (
            <span>Share image</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{cultivarName} share image</DialogTitle>
          <DialogDescription>
            Preview and download the dark or light version.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" role="group" aria-label="Image preview">
          <Button
            type="button"
            variant={preview === "dark" ? "secondary" : "ghost"}
            aria-pressed={preview === "dark"}
            onClick={() => setPreview("dark")}
          >
            Dark preview
          </Button>
          <Button
            type="button"
            variant={preview === "light" ? "secondary" : "ghost"}
            aria-pressed={preview === "light"}
            onClick={() => setPreview("light")}
          >
            Light preview
          </Button>
        </div>
        <img
          src={preview === "dark" ? darkUrl : lightUrl}
          alt={`${preview === "dark" ? "Dark" : "Light"} share image for ${cultivarName}`}
          width={1200}
          height={630}
          className="h-auto w-full rounded-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <a href={darkUrl} download={`${segment}-daylily-catalog-dark.png`}>
              <Download className="size-4" />
              Download dark PNG
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={lightUrl}
              download={`${segment}-daylily-catalog-light.png`}
            >
              <Download className="size-4" />
              Download light PNG
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
