"use client";

import { PublicFeedbackLink } from "@/components/public-feedback-link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function PublicFooter() {
  const pathname = usePathname();
  const usesDarkHeroFooter =
    pathname === "/" || pathname === "/start-membership";

  return (
    <footer
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 w-full bg-transparent before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:bottom-0 before:z-[-1] before:content-[''] before:backdrop-blur-[5px] before:[mask-image:linear-gradient(to_bottom,transparent_0%,#000_20px,#000_100%)] before:[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_20px,#000_100%)]",
        usesDarkHeroFooter ? "text-white" : "text-[#142118]",
      )}
    >
      <div className="px-3 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:px-8">
        <nav
          aria-label="Public footer"
          className="mx-auto flex w-full max-w-[1024px] justify-end"
        >
          <ul className="flex items-center justify-end gap-4 text-right">
            <li>
              <PublicFeedbackLink
                className={cn(
                  "text-[11px] leading-none font-medium underline-offset-4 transition-colors hover:underline",
                  usesDarkHeroFooter
                    ? "text-white/70 hover:text-white"
                    : "text-[#142118]/60 hover:text-[#142118]",
                )}
              >
                Feedback
              </PublicFeedbackLink>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
