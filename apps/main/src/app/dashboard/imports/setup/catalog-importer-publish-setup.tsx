"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { CATALOG_IMPORTER_PUBLISH_SETUP_COMPLETE_PATH } from "@/lib/catalog-importer-membership";
import { isValidSlug, slugify } from "@/lib/utils/slugify";
import { api } from "@/trpc/react";

function normalizeCatalogSlug(value: string) {
  return slugify(value).replaceAll("_", "-");
}

export function CatalogImporterPublishSetup() {
  const profile = api.dashboardDb.userProfile.get.useQuery();

  if (profile.isLoading) {
    return (
      <p
        className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
        role="status"
      >
        <Spinner />
        Loading your catalog details…
      </p>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="space-y-4 py-8" role="alert">
        <div className="space-y-1">
          <p className="font-medium">Catalog details did not load</p>
          <p className="text-muted-foreground text-sm">
            Try again before you update your public catalog.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={profile.isFetching}
          onClick={() => void profile.refetch()}
        >
          {profile.isFetching ? <Spinner /> : null}
          Try again
        </Button>
      </div>
    );
  }

  const initialProfile = profile.data;
  return (
    <CatalogImporterPublishSetupForm
      initialLocation={initialProfile.location ?? ""}
      initialName={initialProfile.title ?? ""}
      initialSlug={
        initialProfile.slug && initialProfile.slug !== initialProfile.userId
          ? initialProfile.slug
          : ""
      }
    />
  );
}

function CatalogImporterPublishSetupForm({
  initialLocation,
  initialName,
  initialSlug,
}: {
  initialLocation: string;
  initialName: string;
  initialSlug: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const updateProfile = api.dashboardDb.userProfile.update.useMutation();
  const [catalogName, setCatalogName] = useState(initialName);
  const [catalogSlug, setCatalogSlug] = useState(initialSlug);
  const [location, setLocation] = useState(initialLocation);
  const [slugWasEdited, setSlugWasEdited] = useState(initialSlug.length > 0);
  const inquiryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "";
  const normalizedSlug = normalizeCatalogSlug(catalogSlug);
  const canContinue =
    catalogName.trim().length > 0 &&
    isValidSlug(normalizedSlug) &&
    !updateProfile.isPending;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue) {
      return;
    }

    await updateProfile.mutateAsync({
      data: {
        title: catalogName.trim(),
        slug: normalizedSlug,
        location: location.trim() || null,
      },
    });
    capturePosthogEvent("catalog_import_publish_setup_completed", {
      has_location: location.trim().length > 0,
    });
    router.replace(CATALOG_IMPORTER_PUBLISH_SETUP_COMPLETE_PATH);
  };

  return (
    <form
      className="max-w-2xl space-y-8"
      onSubmit={(event) => void submit(event)}
    >
      <div className="space-y-2">
        <Label htmlFor="catalog-publish-name">Catalog or nursery name</Label>
        <Input
          id="catalog-publish-name"
          name="catalogName"
          required
          maxLength={120}
          autoComplete="organization"
          value={catalogName}
          onChange={(event) => {
            const nextName = event.target.value;
            setCatalogName(nextName);
            if (!slugWasEdited) {
              setCatalogSlug(normalizeCatalogSlug(nextName));
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalog-publish-slug">Public catalog address</Label>
        <div className="focus-within:ring-ring flex min-w-0 items-center rounded-md border bg-transparent focus-within:ring-2">
          <span className="text-muted-foreground hidden shrink-0 pl-3 text-sm sm:inline">
            daylilycatalog.com/
          </span>
          <Input
            id="catalog-publish-slug"
            name="catalogSlug"
            required
            minLength={5}
            maxLength={50}
            aria-describedby="catalog-publish-slug-help"
            className="min-w-0 border-0 shadow-none focus-visible:ring-0"
            value={catalogSlug}
            onChange={(event) => {
              setSlugWasEdited(true);
              setCatalogSlug(normalizeCatalogSlug(event.target.value));
            }}
          />
        </div>
        <p
          id="catalog-publish-slug-help"
          className="text-muted-foreground text-xs"
        >
          Use at least five letters, numbers, or hyphens.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalog-publish-email">Inquiry email</Label>
        <Input
          id="catalog-publish-email"
          name="inquiryEmail"
          type="email"
          readOnly
          value={inquiryEmail}
        />
        <p className="text-muted-foreground text-xs">
          Buyer inquiries go to the verified email on this account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalog-publish-location">
          Location <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="catalog-publish-location"
          name="location"
          maxLength={160}
          autoComplete="address-level2"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </div>

      <div className="bg-muted/30 space-y-3 rounded-lg p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="text-primary size-4" aria-hidden="true" />
          Your prepared listings stay in this browser
        </p>
        <p className="text-muted-foreground text-sm">
          The next step shows the ready listings before anything is created.
          Unresolved listings remain excluded.
        </p>
      </div>

      {updateProfile.error ? (
        <p className="text-destructive text-sm" role="alert">
          {updateProfile.error.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={!canContinue}>
        {updateProfile.isPending ? <Spinner /> : null}
        Continue to import
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
