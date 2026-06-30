import type { ReactNode } from "react";

interface OnboardingStatusPageProps {
  actions?: ReactNode;
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  testId?: string;
  title: string;
}

export function OnboardingStatusPage({
  actions,
  children,
  description,
  eyebrow,
  testId,
  title,
}: OnboardingStatusPageProps) {
  return (
    <div className="bg-muted/20" data-testid={testId}>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-7">
          <div className="space-y-4">
            {eyebrow ? (
              <p className="text-primary text-sm font-semibold">{eyebrow}</p>
            ) : null}
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-8">
              {description}
            </p>
          </div>

          {children ? <div className="space-y-3">{children}</div> : null}

          {actions ? (
            <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
