import * as React from "react";
import { cn } from "@/lib/utils";

const ProUpgrade = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"section">
>(({ className, ...props }, ref) => (
  <section
    ref={ref}
    data-slot="pro-upgrade"
    className={cn("flex flex-col gap-6", className)}
    {...props}
  />
));
ProUpgrade.displayName = "ProUpgrade";

function ProUpgradeHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pro-upgrade-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function ProUpgradeTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="pro-upgrade-title"
      className={cn(
        "text-2xl leading-tight font-semibold tracking-tight sm:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

function ProUpgradeDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="pro-upgrade-description"
      className={cn(
        "text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base",
        className,
      )}
      {...props}
    />
  );
}

function ProUpgradeContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pro-upgrade-content"
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)] lg:items-end",
        className,
      )}
      {...props}
    />
  );
}

function ProUpgradeDetails({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pro-upgrade-details"
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    />
  );
}

function ProUpgradeSubtitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="pro-upgrade-subtitle"
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function ProUpgradeFeatures({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pro-upgrade-features"
      className={cn("grid gap-2 text-sm", className)}
      {...props}
    />
  );
}

function ProUpgradeFeature({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="pro-upgrade-feature"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function ProUpgradeActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pro-upgrade-actions"
      className={cn("flex min-w-0 flex-col justify-center gap-3", className)}
      {...props}
    />
  );
}

export {
  ProUpgrade,
  ProUpgradeActions,
  ProUpgradeContent,
  ProUpgradeDescription,
  ProUpgradeDetails,
  ProUpgradeFeature,
  ProUpgradeFeatures,
  ProUpgradeHeader,
  ProUpgradeSubtitle,
  ProUpgradeTitle,
};
