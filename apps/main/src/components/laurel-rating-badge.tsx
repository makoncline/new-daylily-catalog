"use client";

import Image from "next/image";

export function LaurelRatingBadge() {
  return (
    <div
      className="flex h-[3.8rem] w-[11.2rem] flex-col items-center bg-[url('/assets/home-redesign/laurel.svg')] bg-contain bg-center bg-no-repeat pt-[0.72rem] invert lg:h-[4.1rem] lg:w-[12.2rem] lg:pt-[0.82rem]"
      aria-label="#1 Daylily App, five stars"
    >
      <p className="text-center text-sm leading-none font-bold tracking-tight text-black lg:text-base">
        #1 Daylily App
      </p>

      <div
        className="mt-[0.38rem] flex justify-center gap-1"
        aria-hidden="true"
      >
        {[1, 2, 3, 4, 5].map((ratingPoint) => (
          <Image
            key={ratingPoint}
            src="/assets/home-redesign/star.svg"
            alt=""
            width={13}
            height={13}
            className="size-3.5"
          />
        ))}
      </div>
    </div>
  );
}
