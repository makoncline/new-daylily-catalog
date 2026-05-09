"use client";

import Image from "next/image";

interface UsedByLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

const USED_BY_LOGOS = [
  {
    name: "Rolling Oaks Daylilies",
    src: "/assets/home-redesign/used-by-logos/01-rolling-oaks-daylilies.png",
    width: 315,
    height: 136,
  },
  {
    name: "Plant Fancy Gardens",
    src: "/assets/home-redesign/used-by-logos/02-plantfancygardens.png",
    width: 365,
    height: 78,
  },
  {
    name: "Fussell Farms",
    src: "/assets/home-redesign/used-by-logos/03-fussell-farms.png",
    width: 278,
    height: 103,
  },
  {
    name: "Wood Branch Daylilies",
    src: "/assets/home-redesign/used-by-logos/04-wood-branch-daylilies.png",
    width: 351,
    height: 95,
  },
  {
    name: "Haley Springs Farm",
    src: "/assets/home-redesign/used-by-logos/05-haley-springs-farm.png",
    width: 357,
    height: 93,
  },
  {
    name: "Graceful Petals Daylilies",
    src: "/assets/home-redesign/used-by-logos/06-graceful-petals-daylilies.png",
    width: 333,
    height: 178,
  },
  {
    name: "Eden on Harrell",
    src: "/assets/home-redesign/used-by-logos/07-eden-on-harrell.png",
    width: 356,
    height: 169,
  },
  {
    name: "Starcrossedseeds",
    src: "/assets/home-redesign/used-by-logos/08-starcrossedseeds.png",
    width: 344,
    height: 66,
  },
] as const satisfies readonly UsedByLogo[];

export function UsedByWave() {
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
        <div className="flex items-baseline gap-5 overflow-hidden">
          <p className="shrink-0 text-[0.72rem] leading-none font-light text-white/55">
            featured catalogs
          </p>
          <div className="flex min-w-max items-baseline gap-8 leading-none lg:gap-11">
            {USED_BY_LOGOS.map((logo, index) => (
              <Image
                key={logo.name}
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className={`inline-block h-7 w-auto align-baseline object-contain opacity-90 lg:h-8 ${
                  index > 3 ? "hidden lg:inline-block" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
