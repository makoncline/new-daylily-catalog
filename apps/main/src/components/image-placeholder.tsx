import { ImageIcon } from "lucide-react";

export function ImagePlaceholder() {
  return (
    <div className="aspect-square">
      <div className="bg-muted flex size-full items-center justify-center">
        <ImageIcon className="text-muted-foreground size-10" />
      </div>
    </div>
  );
}
