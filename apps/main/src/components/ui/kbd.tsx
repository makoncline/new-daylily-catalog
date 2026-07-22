import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface KbdProps extends React.ComponentProps<"kbd"> {
  asChild?: boolean;
}

function Kbd({ asChild = false, className, ...props }: KbdProps) {
  const Comp = asChild ? Slot : "kbd";

  return (
    <Comp
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        asChild &&
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring pointer-events-auto cursor-pointer outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
