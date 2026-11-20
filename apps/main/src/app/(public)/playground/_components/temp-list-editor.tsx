"use client";

import { useState, useLayoutEffect, useRef } from "react";
import { AhsListingLinkPanel } from "@/components/ahs-listing-link-panel";
import { Button } from "@/components/ui/button";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ChevronsUpDown } from "lucide-react";
import { ListingEditorLayout } from "@/components/forms/listing-editor-layout";
import {
  ListingNameField,
  ListingDescriptionField,
  ListingPrivateNoteField,
} from "@/components/forms/listing-details-fields";
import {
  listingFormSchema,
  type ListingFormData,
} from "@/types/schemas/listing";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  FieldError,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TempListCultivarSearch } from "./temp-list-cultivar-search";
import { CatalogListSelect } from "@/components/catalog-builder/catalog-list-select";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import {
  getCandidateAhsDisplayListing,
  getCultivarImage,
} from "@/lib/catalog-presentation";
import { tempListingInputSchema, type TempListing } from "../_lib/temp-list";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

export function TempListEditor({
  listing,
  initialMatch,
  listOptions,
  storageError,
  onClose,
  onSave,
  onRemove,
}: {
  listing: TempListing;
  initialMatch: CultivarMatchCandidate | null;
  listOptions: string[];
  storageError: string | null;
  onClose: () => void;
  onSave: (listing: TempListing, match: CultivarMatchCandidate | null) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState(listing);
  const form = useForm<ListingFormData>({
    resolver: zodResolver(
      listingFormSchema.extend({
        title: tempListingInputSchema.shape.name.optional(),
        description: tempListingInputSchema.shape.description
          .nullable()
          .optional(),
        privateNote: tempListingInputSchema.shape.privateNote
          .nullable()
          .optional(),
      }),
    ),
    defaultValues: {
      title: listing.name,
      price: listing.price,
      description: listing.description,
      privateNote: listing.privateNote,
    },
  });
  const name = useWatch({ control: form.control, name: "title" });
  const price = useWatch({ control: form.control, name: "price" });
  const backRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const previousScroll = window.scrollY;
    window.scrollTo(0, 0);
    backRef.current?.focus({ preventScroll: true });
    return () => window.scrollTo(0, previousScroll);
  }, []);
  const { confirmDiscard } = useUnsavedChangesGuard(
    () =>
      form.formState.isDirty ||
      draft.cultivarReferenceId !== listing.cultivarReferenceId ||
      JSON.stringify(draft.lists ?? []) !== JSON.stringify(listing.lists ?? []),
  );
  function closeEditor() {
    if (confirmDiscard()) onClose();
  }

  const [match, setMatch] = useState(initialMatch);
  const [selectingCultivar, setSelectingCultivar] = useState(false);

  return (
    <ListingEditorLayout
      backAction={
        <Button
          ref={backRef}
          type="button"
          variant="outline"
          onClick={closeEditor}
        >
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Back to catalog
        </Button>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit((values) => {
          if (!values.title?.trim()) return;
          onSave(
            {
              ...draft,
              name: values.title.trim(),
              price: values.price ?? null,
              description: values.description ?? "",
              privateNote: values.privateNote ?? "",
              cultivarReferenceId:
                match?.cultivarReferenceId ?? draft.cultivarReferenceId,
            },
            match,
          );
        })}
      >
        <FieldGroup>
          <ListingNameField form={form} disabled={false} help={null} />
          <ListingDescriptionField form={form} disabled={false} help={null} />
          <Field data-invalid={Boolean(form.formState.errors.price)}>
            <FieldLabel htmlFor="temp-price">Price</FieldLabel>
            <InputGroup>
              <InputGroupAddon aria-hidden="true">$</InputGroupAddon>
              <InputGroupInput
                id="temp-price"
                aria-invalid={Boolean(form.formState.errors.price)}
                aria-describedby={
                  form.formState.errors.price ? "temp-price-error" : undefined
                }
                type="number"
                min="0"
                step="any"
                value={price ?? ""}
                onChange={(event) =>
                  form.setValue(
                    "price",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                    { shouldDirty: true },
                  )
                }
              />
            </InputGroup>
            <FieldError
              id="temp-price-error"
              errors={[form.formState.errors.price]}
            />
          </Field>
          <ListingPrivateNoteField form={form} disabled={false} help={null} />
          <Field>
            <FieldTitle>Lists</FieldTitle>
            <CatalogListSelect
              inline={false}
              label="Lists"
              options={[
                ...new Set([...listOptions, ...(draft.lists ?? [])]),
              ].sort()}
              values={draft.lists ?? []}
              onChange={(lists) => setDraft({ ...draft, lists })}
            />
          </Field>
          <Field>
            <FieldTitle>Link to Daylily Database Listing</FieldTitle>
            <AhsListingLinkPanel
              listingName={name ?? null}
              linkedAhs={match ? getCandidateAhsDisplayListing(match) : null}
              cultivarReferenceImage={getCultivarImage(match)}
              cultivarHref={
                match
                  ? `/cultivar/${toCultivarRouteSegment(match.normalizedName)}`
                  : null
              }
              onSyncName={() => {
                if (match)
                  form.setValue("title", match.displayName, {
                    shouldDirty: true,
                  });
              }}
              onUnlink={() => {
                setMatch(null);
                setDraft({ ...draft, cultivarReferenceId: null });
              }}
            >
              <Dialog
                open={selectingCultivar}
                onOpenChange={setSelectingCultivar}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    Select Daylily Database listing…
                    <ChevronsUpDown aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Daylily Database Listing</DialogTitle>
                    <DialogDescription className="sr-only">
                      Search by cultivar name to link database details and a
                      photo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    <TempListCultivarSearch
                      disabled={false}
                      onSelect={(candidate) => {
                        setMatch(candidate);
                        setDraft({
                          ...draft,
                          cultivarReferenceId: candidate.cultivarReferenceId,
                        });
                        setSelectingCultivar(false);
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </AhsListingLinkPanel>
          </Field>
          {draft.extraFields?.length ? (
            <section
              aria-label="Imported columns"
              className="flex flex-col gap-3"
            >
              <h3 className="font-semibold">Imported columns</h3>
              <p className="text-muted-foreground text-sm">
                Kept in your spreadsheet download.
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {draft.extraFields.map(({ label, value }) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground break-words">
                      {label}
                    </dt>
                    <dd className="break-words whitespace-pre-wrap">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {storageError ? (
            <p role="alert" className="text-destructive text-sm">
              {storageError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={!name?.trim()}>
              Save Changes
            </Button>
            {onRemove ? (
              <Button type="button" variant="destructive" onClick={onRemove}>
                Remove listing
              </Button>
            ) : null}
          </div>
        </FieldGroup>
      </form>
    </ListingEditorLayout>
  );
}
