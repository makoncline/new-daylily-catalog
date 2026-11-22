import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "",
        inline:
          "border-ring aria-invalid:border-destructive h-12 min-h-0 resize-none rounded-none border-0 border-b px-2 py-1 text-sm leading-5 shadow-none focus-visible:ring-0",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <textarea
      className={cn(textareaVariants({ variant }), className)}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
