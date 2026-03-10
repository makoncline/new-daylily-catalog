import { ImageIcon } from "lucide-react";

export function ImagePlaceholder() {
  return (
    <div className="aspect-square">
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
      </div>
    </div>
  );
}
