"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { normalizeError, reportError } from "@/lib/error-utils";
import { insertList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { ListingSurfaceSaveBar } from "../../listings/_components/listing-surface-save-bar";

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
    <section aria-label="Create list" className="mx-auto w-full max-w-3xl pb-8">
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
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to lists
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            List details
          </CardTitle>
          <CardDescription>
            Start with a title. You can add a description and listings next.
          </CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <CardContent>
            <FieldGroup>
              <Field data-disabled={isSaving}>
                <FieldLabel htmlFor="title">List Title (required)</FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter a title"
                  disabled={isSaving}
                  required
                  aria-describedby="list-title-help"
                />
                <FieldDescription id="list-title-help">
                  Use a name that helps you find this collection.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSaving || !title.trim()}>
              {isSaving ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                "Create List"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
