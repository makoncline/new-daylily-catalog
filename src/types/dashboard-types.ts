import type { RouterOutputs } from "@/trpc/react";
import type { LucideIcon } from "lucide-react";

export interface BaseStep {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface ProfileStep extends BaseStep {
  id: "hasProfileImage" | "description" | "content" | "location";
}

export interface CatalogStep extends BaseStep {
  target: string;
  isComplete: (stats: RouterOutputs["dashboard"]["getStats"]) => boolean;
}

export interface StepProps {
  completed: boolean;
  label: string;
  description: string;
  icon: React.ElementType;
  isLast?: boolean;
}
