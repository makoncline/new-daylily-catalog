import type { ReactNode } from "react";

interface CheckoutStatusPageProps {
  actions?: ReactNode;
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  testId?: string;
  title: string;
}

export function CheckoutStatusPage({
  actions,
  children,
  description,
  eyebrow,
  testId,
  title,
}: CheckoutStatusPageProps) {
  return (
    <div className="bg-muted/20" data-testid={testId}>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <p className="text-xs font-semibold tracking-wide text-[#b7791f] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground max-w-xl text-base leading-7">
              {description}
            </p>
          </div>

          {children ? (
            <div className="flex flex-col gap-3">{children}</div>
          ) : null}

          {actions ? (
            <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
