import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-nav";
import { cn } from "@/lib/utils";

interface PublicShellProps {
  children: React.ReactNode;
  mainClassName?: string;
}

export function PublicShell({ children, mainClassName }: PublicShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-[#f6f8f3] text-[#142118]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-[#142118] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main
        id="main-content"
        className={cn(
          "-mt-16 w-full flex-1 scroll-mt-24 overflow-hidden pt-16 pb-[calc(2.25rem+env(safe-area-inset-bottom))] lg:-mt-20 lg:scroll-mt-28 lg:pt-20 [&_[id]]:scroll-mt-24 lg:[&_[id]]:scroll-mt-28",
          mainClassName,
        )}
      >
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
