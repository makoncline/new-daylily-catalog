"use client";

import Image from "next/image";

export interface UsedByLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

export function UsedByWave({ logos }: { logos: readonly UsedByLogo[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 px-4 text-white lg:px-8">
      <svg
        viewBox="0 0 1440 120"
        className="absolute inset-x-0 bottom-0 z-0 h-20 w-full text-black lg:h-24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M1440,21.2101911 L1440,120 L0,120 L0,21.2101911 C120,35.0700637 240,42 360,42 C480,42 600,35.0700637 720,21.2101911 C808.32779,12.416393 874.573633,6.87702029 918.737528,4.59207306 C972.491685,1.8109458 1026.24584,0.420382166 1080,0.420382166 C1200,0.420382166 1320,7.35031847 1440,21.2101911 Z"
        />
      </svg>

      <div className="relative z-10 mx-auto mt-3 max-w-[1024px]">
        <div className="flex items-baseline gap-4 overflow-hidden">
          <p className="shrink-0 text-[0.68rem] leading-none font-light text-white/50">
            used by
          </p>
          <div className="flex min-w-max items-baseline gap-8 leading-none lg:gap-12">
            {logos.map((logo) => (
              <Image
                key={logo.name}
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="inline-block h-5 w-auto align-baseline object-contain opacity-90 lg:h-6"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
