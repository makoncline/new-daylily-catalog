"use client";

import { Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATALOG_SIZE_OPTIONS,
  WORKFLOW_OPTIONS,
} from "./anonymous-onboarding-config";
import type {
  AnonymousOnboardingCatalogSize,
  AnonymousOnboardingWorkflow,
} from "./anonymous-onboarding-draft";
import type { AnonymousOnboardingController } from "./use-anonymous-onboarding-controller";

type SelectableOption<T extends string> = {
  id: T;
  label: string;
  description: string;
};

function OptionGrid<T extends string>({
  options,
  selected,
  onSelect,
  testIdPrefix,
}: {
  options: Array<SelectableOption<T>>;
  selected: T | null;
  onSelect: (value: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="divide-y divide-[#d8dfd2] border-y border-[#d8dfd2]">
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isSelected}
            data-testid={`${testIdPrefix}-${option.id}`}
            onClick={() => onSelect(option.id)}
            className={cn(
              "group relative flex min-h-16 w-full items-center px-1 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#b7791f] focus-visible:outline-none sm:px-2",
              isSelected ? "bg-[#fff8e8]" : "hover:bg-white/70",
            )}
          >
            <span className="flex w-full items-start justify-between gap-4">
              <span>
                <span className="block text-base leading-6 font-semibold text-[#142118]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-[#536357]">
                  {option.description}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-[#b7791f] bg-[#b7791f] text-white"
                    : "border-[#b9c6b8] text-transparent",
                )}
              >
                <Check className="size-3.5" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function WorkflowStep({
  draft,
  setCatalogSize,
  setWorkflow,
}: Pick<
  AnonymousOnboardingController,
  "draft" | "setCatalogSize" | "setWorkflow"
>) {
  return (
    <section className="mx-auto max-w-4xl space-y-7">
      <div className="space-y-3">
        <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
          Your starting point
        </p>
        <h2 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance text-[#142118] md:text-5xl">
          Tell us just enough to shape the preview.
        </h2>
        <p className="max-w-2xl text-base leading-7 text-[#536357] md:text-lg">
          Two quick choices. Nothing here changes what the product can do.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <h3 className="mb-3 text-lg font-semibold text-[#142118]">
            How do buyers see your availability now?
          </h3>
          <OptionGrid<AnonymousOnboardingWorkflow>
            options={WORKFLOW_OPTIONS}
            selected={draft.workflow}
            onSelect={setWorkflow}
            testIdPrefix="onboarding-workflow"
          />
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold text-[#142118]">
            How many cultivars might you list?
          </h3>
          <OptionGrid<AnonymousOnboardingCatalogSize>
            options={CATALOG_SIZE_OPTIONS}
            selected={draft.catalogSize}
            onSelect={setCatalogSize}
            testIdPrefix="onboarding-catalog-size"
          />
        </div>
      </div>
    </section>
  );
}

export function PersonalizeStep({
  draft,
  updateProfileGardenName,
}: Pick<AnonymousOnboardingController, "draft" | "updateProfileGardenName">) {
  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-[#a94e38] uppercase">
            Make it yours
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#142118] md:text-5xl">
            What should your catalog be called?
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#536357]">
            Enter it once here. After signup you can add a location,
            description, and catalog image from your dashboard.
          </p>
        </div>
        <div className="max-w-xl space-y-2">
          <label
            htmlFor="onboarding-garden-name"
            className="text-sm font-semibold"
          >
            Garden or seller name
          </label>
          <Input
            id="onboarding-garden-name"
            data-testid="onboarding-personalize-name"
            className="h-12 text-base"
            value={draft.profile.gardenName}
            onChange={(event) => updateProfileGardenName(event.target.value)}
            placeholder="Example: Mountain View Daylilies"
            maxLength={120}
          />
          <p className="text-xs text-[#657267]">
            The URL below is only an example. Nothing is reserved or published
            yet.
          </p>
        </div>
        <div className="border-y border-[#d8dfd2] py-5">
          <div className="flex items-center gap-2 text-[#8a5c16]">
            <Sparkles className="size-4" />
            <p className="text-xs font-bold tracking-wide uppercase">
              Example URL
            </p>
          </div>
          <p className="ph-mask mt-2 font-mono text-sm text-[#142118]">
            daylilycatalog.com/
            {draft.profile.gardenName.trim() ? "your-garden" : "your-catalog"}
          </p>
        </div>
      </div>
    </section>
  );
}
