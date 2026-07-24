import type { ComponentProps } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

function MarketingHero({
  className,
  children,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      data-slot="marketing-hero"
      className={cn(
        "relative isolate overflow-hidden bg-[#07120e] px-4 pt-24 pb-36 text-white lg:px-8 lg:pt-24 lg:pb-32",
        className,
      )}
      {...props}
    >
      <div
        data-slot="marketing-hero-backdrop"
        className="absolute inset-0 -z-10 bg-[#07120e]"
        aria-hidden="true"
      >
        <Image
          src="/assets/home-redesign/daylily-hero-grid.webp"
          alt=""
          fill
          priority
          sizes="140vw"
          className="marketing-hero-grid-pan size-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.72)_38%,rgba(7,18,14,0.2)_72%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),radial-gradient(circle_at_100%_100%,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.62)_42%,rgba(7,18,14,0.12)_72%,rgba(7,18,14,0)_100%)]" />
      </div>

      {children}

      <style>{`
        @keyframes marketing-hero-grid-pan {
          0%,
          100% {
            transform: scale(var(--marketing-hero-grid-scale)) translate3d(8%, 0, 0);
          }
          50% {
            transform: scale(var(--marketing-hero-grid-scale)) translate3d(-8%, 0, 0);
          }
        }

        .marketing-hero-grid-pan {
          --marketing-hero-grid-scale: 1.38;
          animation: marketing-hero-grid-pan 82s ease-in-out infinite;
          animation-delay: -18s;
          transform-origin: center;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .marketing-hero-grid-pan {
            animation: none;
            transform: scale(var(--marketing-hero-grid-scale));
          }
        }

        @media (max-width: 1023px) {
          .marketing-hero-grid-pan {
            --marketing-hero-grid-scale: 1.95;
          }
        }
      `}</style>
    </section>
  );
}

function MarketingHeroContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="marketing-hero-content"
      className={cn("mx-auto max-w-[1024px]", className)}
      {...props}
    />
  );
}

export { MarketingHero, MarketingHeroContent };
