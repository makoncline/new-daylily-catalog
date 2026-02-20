# Public Route Migration Patterns (`/{slug}`)

This document captures the patterns implemented during the public profile refactor (`/{slug}` + `/{slug}?page=N`).
Use these patterns as the default migration target for other public/SEO route segments.

## Goals

- Keep behavior stable while making orchestration easier to read and change.
- Keep server work on the server, and keep client views simple.
- Avoid hydration mismatches on static pages with interactive client controls.

## 1) Thin Route Variants + Shared Shell

Keep route files focused on:

- param parsing
- route validity checks
- canonical redirect behavior
- calling shared loader + model builder
- rendering one shared shell

### Example

```tsx
// src/app/(public)/[userSlugOrId]/page.tsx
export default async function Page({ params }: PageProps) {
  const { userSlugOrId } = await params;
  const requestedPage = 1;

  const pageDataResult = await tryCatch(
    getPublicProfilePageData(userSlugOrId, requestedPage),
  );

  if (getErrorCode(pageDataResult.error) === "NOT_FOUND") notFound();
  if (pageDataResult.error) throw pageDataResult.error;

  const pageData = pageDataResult.data;
  const model = await buildPublicProfilePageModel(pageData);

  if (userSlugOrId !== model.canonicalUserSlug) {
    permanentRedirect(`/${model.canonicalUserSlug}`);
  }

  if (requestedPage !== pageData.page) notFound();

  return <PublicProfilePageShell model={model} />;
}
```

## 2) Route Loader Owns Fetch + Cache Policy

Create a route-level loader in `_lib` and keep cache policy there (not in route files).

- Fetch independent data in parallel with `Promise.all`.
- Wrap with `unstable_cache` for cross-request caching.
- Wrap with `react/cache` for request/render dedupe.
- Use tags for both global and targeted invalidation.

### Example

```ts
async function loadPublicProfilePageDataUncached(userSlugOrId: string, page: number) {
  const [profile, listingPage] = await Promise.all([
    getPublicProfile(userSlugOrId),
    getPublicListingsPage({ userSlugOrId, page, pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE }),
  ]);

  const forSaleCount = await getPublicForSaleListingsCount(profile.id);

  return { profile, items: listingPage.items, page: listingPage.page, totalPages: listingPage.totalPages, totalCount: listingPage.totalCount, pageSize: listingPage.pageSize, forSaleCount };
}

const getPublicProfilePageDataByProfileMemoized = cache((userSlugOrId: string) =>
  unstable_cache(
    async (page: number) => loadPublicProfilePageDataUncached(userSlugOrId, page),
    ["public-profile-page-data", userSlugOrId.toLowerCase()],
    {
      revalidate: PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE,
      tags: ["public-profile-page-data", `public-profile-page-data:${userSlugOrId.toLowerCase()}`],
    },
  ),
);
```

## 3) Server Model Builder: One Place for Derived View State

Use a server model builder (`build*Model`) that converts route data into final section props.

- derive canonical slug
- build metadata once
- build hrefs once
- preformat display labels once
- shape data to exactly what views need

Component props/interfaces live in component files; model builder imports those types.

### Example

```ts
// src/app/(public)/[userSlugOrId]/_lib/public-profile-model.ts
export async function buildPublicProfilePageModel(
  data: PublicProfilePageData,
): Promise<PublicProfilePageViewModel> {
  const canonicalUserSlug = data.profile.slug ?? data.profile.id;

  return {
    canonicalUserSlug,
    seo: await toSeoModel(data, canonicalUserSlug),
    profileContent: toProfileContentModel(data.profile, canonicalUserSlug),
    listings: {
      listsSection: toCatalogListsSectionModel(data.profile, canonicalUserSlug, data.forSaleCount),
      listingsSection: toCatalogListingsSectionModel(data, canonicalUserSlug),
    },
    searchPrefetch: toSearchPrefetchModel(data.profile, canonicalUserSlug),
    breadcrumbProfile: toBreadcrumbProfileModel(data.profile),
  };
}
```

## 4) URL Building Is a Shared Utility (Not Inline JSX Logic)

Never build public route URLs ad-hoc in components. Use shared helpers.

### Example helpers

```ts
getPublicCatalogSearchPath(slug, page)
getPublicCatalogForSaleSearchPath(slug)
getPublicCatalogListSearchPath(slug, listId)
getPublicProfilePaginationHref(slug, page, "listings")
```

Result: views receive final `href` props and stay headless.

## 5) Client Pattern: `use*ViewProps` + Headless View

For client components with route/query logic, use:

- `use*ViewProps` hook: computes and returns exact view props
- `*View`: render-only component
- thin wrapper container: `<View {...use*ViewProps(...)} />`

### Example

```tsx
export function useCatalogNavViewProps({ canonicalUserSlug }: CatalogNavProps): CatalogNavViewProps {
  // pathname/searchParams parsing + derived sections + click behavior
  return { sections, onSectionClick };
}

export function CatalogNav(props: CatalogNavProps) {
  return <CatalogNavView {...useCatalogNavViewProps(props)} />;
}
```

## 5.1) Hooks Convention (What to Return)

Use hooks as the model/controller boundary. Return exactly what the view needs.

- Prefer `use*ViewProps` return types that match `*ViewProps`.
- Keep wrappers mechanical (`<View {...hookResult} />`).
- Keep side effects/DOM behavior in the hook when it is part of behavior (for example, smooth-scroll handlers).
- Avoid returning extra fields that wrappers do not use.

## 5.2) Compound Components: When To Use vs Avoid

Use compound components selectively.

Reference example: [Compound Components with React Hooks (Kent C. Dodds)](https://kentcdodds.com/blog/compound-components-with-react-hooks)

Use compound components when:

- there are many nested descendants sharing state
- callers need flexible composition/reordering of internals
- the API is meant to expose a namespace (`X.Root`, `X.Section`, `X.Actions`)

Avoid compound components when:

- the tree is shallow and explicit props are clearer
- context would hide important dataflow
- simple section components already model the UI well

In this migration, we **did not** keep compound wrappers for `CatalogSeoListings`/page shell because explicit section props were clearer and easier to change.

### Compound example pattern (when appropriate)

```tsx
type PanelState = { open: boolean; setOpen: (next: boolean) => void };
const PanelCtx = React.createContext<PanelState | null>(null);

function usePanelCtx() {
  const ctx = React.useContext(PanelCtx);
  if (!ctx) throw new Error("Panel.* must be used within Panel.Root");
  return ctx;
}

export const Panel = {
  Root({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return <PanelCtx.Provider value={{ open, setOpen }}>{children}</PanelCtx.Provider>;
  },
  Trigger({ children }: { children: React.ReactNode }) {
    const { setOpen } = usePanelCtx();
    return <button onClick={() => setOpen(true)}>{children}</button>;
  },
  Content({ children }: { children: React.ReactNode }) {
    const { open } = usePanelCtx();
    if (!open) return null;
    return <div>{children}</div>;
  },
} as const;
```

## 6) Hydration Safety for Static Pages with Radix/Auth Controls

For static public pages, avoid SSR/client mismatches from runtime-generated IDs or auth branches.

Use:

- `next/dynamic(..., { ssr: false })` for auth-dependent controls in nav
- `ClientOnly` fallback wrappers for Radix controls that generate dynamic IDs (`Dialog`, `Select`)

### Examples

- `src/components/public-nav.tsx`: `DashboardButton` loaded with `ssr: false` + stable fallback button.
- `src/components/floating-cart-button.tsx`: wrapped in `ClientOnly` with fallback markup.
- `src/app/(public)/[userSlugOrId]/_components/catalog-seo-pagination.tsx`: `Select` wrapped in `ClientOnly` fallback.

## 7) Validate Untrusted JSON at the Server Boundary

Parse and validate JSON once at ingestion boundary, not in view components.

### Example

```ts
// src/server/db/parse-public-profile-content.ts
export function parsePublicProfileContent(content: string | null | undefined) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as unknown;
    return isEditorOutputData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
```

Then `getPublicProfile` uses this helper and returns `OutputData | null` only.

## 8) Static First-Response Rule for SEO Pages

If first HTML must contain core content, do not add segment `loading.tsx` that turns the route into streamed shell-first output.

- Keep static route rendering direct.
- Keep first-response E2E guard test in place (`tests/e2e/public-profile-first-response.e2e.ts`).

## 9) Testing Pattern for Migration Work

- Model tests: assert derived URLs/labels/shape (`tests/public-profile-model.test.ts`).
- Component tests: render with props produced by model builder fixtures (`tests/catalog-seo-listings.test.tsx`).
- Targeted boundary tests: parser/guard utilities (`tests/parse-public-profile-content.test.ts`).
- One first-response E2E for static SEO integrity.

## Migration Checklist (Copy/Paste)

1. Move duplicated route orchestration into one shell + one model builder.
2. Keep route files thin and explicit about route validity + redirects.
3. Centralize data loading and caching in route `_lib` helpers.
4. Parallelize independent fetches with `Promise.all`.
5. Move URL derivation into shared URL helper utilities.
6. Keep component prop types in component files.
7. Use `use*ViewProps` + render-only views for client route logic.
8. Guard hydration-sensitive controls with `ClientOnly` or `dynamic(..., { ssr:false })`.
9. Validate untrusted JSON once at server boundary.
10. Preserve static first-response behavior for crawl-critical pages.
