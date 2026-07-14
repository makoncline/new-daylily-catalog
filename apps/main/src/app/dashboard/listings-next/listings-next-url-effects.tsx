"use client";

import { useEffect } from "react";

export function ListingsNextUrlEffects({
  editingId,
  showImages,
}: {
  editingId: string | null;
  showImages: boolean;
}) {
  useEffect(() => {
    if (!editingId || !showImages) return;

    const scrollToImages = () => {
      const editor = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-managed-edit-entity-id]",
        ),
      ).find(
        (element) =>
          element.dataset.managedEditEntityId === editingId,
      );
      const section = editor?.querySelector<HTMLElement>(
        '[data-listing-editor-section="images"]',
      );
      if (!section) return false;
      section.scrollIntoView({ block: "start" });
      return true;
    };

    if (scrollToImages()) return;
    const observer = new MutationObserver(() => {
      if (scrollToImages()) observer.disconnect();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-managed-edit-entity-id"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [editingId, showImages]);

  return null;
}
