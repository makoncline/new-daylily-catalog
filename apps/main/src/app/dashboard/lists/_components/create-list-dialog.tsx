"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { normalizeError, reportError } from "@/lib/error-utils";
import { insertList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { ListingSurfaceSaveBar } from "../../listings/_components/listing-surface-save-bar";

export function useCreateList() {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "creating",
    scroll: false,
  });
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return {
    closeCreateList: () => setValue(null, "replace"),
    finishCreateList: (listId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("creating");
      params.set("editing", listId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    isCreating: value === "true",
    openCreateList: () => setValue("true"),
  };
}

export function CreateListSurface({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (listId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasPendingChanges = () => Boolean(title.trim());
  const { confirmDiscard } = useUnsavedChangesGuard(hasPendingChanges);

  useLayoutEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title required", {
        description: "Please enter a title for your list.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newList = await insertList({
        title: title.trim(),
        description: "",
      });

      toast.success("List created", {
        description: `${newList.title} has been created.`,
      });

      onCreated(newList.id);
    } catch (error) {
      toast.error("Failed to create list");
      reportError({
        error: normalizeError(error),
        context: { source: "CreateListDialog" },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (confirmDiscard()) {
      onClose();
    }
  };

  return (
    <section
      aria-label="Create list"
      className="mx-auto w-full max-w-3xl pb-8"
    >
      {hasPendingChanges() ? (
        <ListingSurfaceSaveBar
          title="Unsaved list"
          saveLabel="Save"
          isSaving={isSaving}
          saveDisabled={false}
          onDiscard={onClose}
          onSave={() => void handleCreate()}
        />
      ) : null}

      <PageHeader
        heading="Create New List"
        text="Create a new list to organize your daylilies."
      >
        <Button
          ref={backButtonRef}
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isSaving}
        >
          <ArrowLeft aria-hidden="true" />
          Back to lists
        </Button>
      </PageHeader>

      <div className="space-y-6 pb-16">
        <div className="space-y-2">
          <Label htmlFor="title">
            List Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter a title"
            disabled={isSaving}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? (
              <>
                <Spinner aria-hidden="true" />
                Creating…
              </>
            ) : (
              "Create List"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
