"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getShortcutLabel() {
  if (typeof navigator === "undefined") {
    return "Cmd+Option+X";
  }

  return /Mac/i.test(navigator.platform) ? "Cmd+Option+X" : "Ctrl+Alt+X";
}

export function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRevalidatingCurrentPage, setIsRevalidatingCurrentPage] =
    useState(false);
  const [isLoadingCurrentPageCacheMetadata, setIsLoadingCurrentPageCacheMetadata] =
    useState(false);
  const [currentPageCachedAtIso, setCurrentPageCachedAtIso] = useState<string | null>(
    null,
  );
  const [currentPageCacheStatus, setCurrentPageCacheStatus] = useState<string | null>(
    null,
  );
  const [currentPageCacheSource, setCurrentPageCacheSource] = useState<string | null>(
    null,
  );
  const shortcutLabel = useMemo(() => getShortcutLabel(), []);
  const pathname = usePathname();
  const router = useRouter();
  const currentPathname = pathname ?? "/";

  const loadCurrentPageCacheMetadata = useCallback(async () => {
    setIsLoadingCurrentPageCacheMetadata(true);

    try {
      const response = await fetch(
        `/api/admin/revalidate-path?path=${encodeURIComponent(currentPathname)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const responseBody =
        (await response.json().catch(() => null)) as
          | {
              error?: string;
              cachedAtIso?: string | null;
              cacheStatus?: string | null;
              cachedAtSource?: string | null;
            }
          | null;

      if (!response.ok) {
        throw new Error(responseBody?.error ?? "Failed to load page cache info");
      }

      setCurrentPageCachedAtIso(responseBody?.cachedAtIso ?? null);
      setCurrentPageCacheStatus(responseBody?.cacheStatus ?? null);
      setCurrentPageCacheSource(responseBody?.cachedAtSource ?? null);
    } catch {
      setCurrentPageCachedAtIso(null);
      setCurrentPageCacheStatus(null);
      setCurrentPageCacheSource(null);
    } finally {
      setIsLoadingCurrentPageCacheMetadata(false);
    }
  }, [currentPathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcutKey =
        (event.metaKey || event.ctrlKey) &&
        event.altKey &&
        event.code === "KeyX";

      if (!isShortcutKey) {
        return;
      }

      event.preventDefault();
      setIsOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loadCurrentPageCacheMetadata]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadCurrentPageCacheMetadata();
  }, [isOpen, loadCurrentPageCacheMetadata]);

  const handleRevalidateCurrentPage = async () => {
    if (isRevalidatingCurrentPage) {
      return;
    }

    setIsRevalidatingCurrentPage(true);

    try {
      const response = await fetch("/api/admin/revalidate-path", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          path: currentPathname,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as {
        error?: string;
        revalidatedPath?: string;
      } | null;

      if (!response.ok) {
        throw new Error(responseBody?.error ?? "Revalidation request failed");
      }

      toast.success("Revalidated current page", {
        description: responseBody?.revalidatedPath ?? currentPathname,
      });
      router.refresh();
      await loadCurrentPageCacheMetadata();
    } catch (error) {
      toast.error("Failed to revalidate current page", {
        description:
          error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setIsRevalidatingCurrentPage(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Menu</DialogTitle>
          <DialogDescription>
            Secret admin menu shortcut: {shortcutLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleRevalidateCurrentPage}
            disabled={isRevalidatingCurrentPage}
            className="w-full"
          >
            {isRevalidatingCurrentPage ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Revalidating...
              </>
            ) : (
              "Revalidate current page"
            )}
          </Button>

          <div className="text-muted-foreground space-y-1 text-xs">
            <div>Current path: {currentPathname}</div>
            <div>
              Cache status:{" "}
              {isLoadingCurrentPageCacheMetadata
                ? "Loading..."
                : currentPageCacheStatus ?? "Unknown"}
            </div>
            <div>
              Cached at:{" "}
              {isLoadingCurrentPageCacheMetadata
                ? "Loading..."
                : currentPageCachedAtIso ?? "Unavailable"}
            </div>
            <div>
              Cache timestamp source:{" "}
              {isLoadingCurrentPageCacheMetadata
                ? "Loading..."
                : currentPageCacheSource ?? "Unknown"}
            </div>
            {process.env.NODE_ENV !== "production" ? (
              <div>
                Dev mode note: cache metadata is usually unavailable until running
                a production build.
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
