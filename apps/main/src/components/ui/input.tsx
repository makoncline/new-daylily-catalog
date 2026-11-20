import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "border-input file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "",
        inline:
          "border-ring aria-invalid:border-destructive h-9 rounded-none border-0 border-b px-2 py-1 text-sm leading-5 shadow-none focus-visible:ring-0",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & VariantProps<typeof inputVariants>
>(({ className, type, variant, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        inputVariants({ variant }),
        variant === "inline" && type === "number" && "text-right tabular-nums",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
