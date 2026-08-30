# Public storefront API

Use this API to read one complete public seller storefront.

## Request

```http
GET /api/v1/storefronts/{sellerId}
```

`sellerId` is the Daylily Catalog `User.id`. It is the only accepted seller
identifier. `User.id` is required. A profile slug is optional and can change.
The storefront deployment must keep the user ID in server configuration. A
branded storefront URL must not contain the user ID.

The endpoint does not require authentication.

Use the canonical path without query parameters. Do not send an `Authorization`
header, a Clerk `__session` or `__session_*` cookie, `Pragma: no-cache`, or a
`Cache-Control` request directive of `no-cache`, `no-store`, or `max-age=0`.
The route rejects these requests before it reads artifact storage. Anonymous
preference and analytics cookies are accepted because they do not change the
public representation.

## Success response

The response status is `200`. Dates use ISO 8601 strings.

```ts
interface PublicStorefrontSnapshot {
  version: 1;
  generatedAt: string;
  seller: {
    id: string;
    profile: {
      slug: string | null;
      title: string | null;
      description: string | null;
      content: OutputData | null;
      location: string | null;
      images: PublicImage[];
      updatedAt: string;
    } | null;
  };
  lists: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    listingIds: string[];
    updatedAt: string;
  }>;
  listings: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: number | null;
    images: PublicImage[];
    cultivar: {
      id: string;
      normalizedName: string | null;
      details: {
        id: string;
        name: string | null;
        ahsImageUrl: string | null;
        hybridizer: string | null;
        year: string | null;
        seedlingNum: string | null;
        scapeHeight: string | null;
        bloomSize: string | null;
        bloomSeason: string | null;
        rebloom: boolean | null;
        ploidy: string | null;
        foliageType: string | null;
        bloomHabit: string | null;
        color: string | null;
        form: string | null;
        parentage: string | null;
        fragrance: string | null;
        budcount: string | null;
        branches: string | null;
        sculpting: string | null;
        foliage: string | null;
        flower: string | null;
      } | null;
    } | null;
    updatedAt: string;
  }>;
}

interface PublicImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  blurUrl: string | null;
  order: number;
}
```

The `listings` array contains all public listings for the seller. This includes
listings that are not in a list. A list contains only public listing IDs for the
same seller. Listing images contain the cultivar image as a fallback when the
listing has no image. Image objects always contain all five keys. `order` is a
nonnegative integer and is unique in one image array. A ready generated
cultivar image takes precedence over the trusted AHS registry URL.

Cultivar details use the V2 AHS record when it exists. A legacy-only cultivar
reference uses its public `AhsListing` fields. Legacy data has `rebloom: null`
because that source has no rebloom field. The builder does not derive a
seedling number or other missing trait.

The builder includes only ready profile and listing assets of the correct kind.
It includes direct assets that do not have a legacy image ID. It does not use
an asset's original URL. An unmatched legacy image is public only when its URL
uses the exact `media.daylilycatalog.com` host. These rules apply before the
artifact is published.

The API sorts lists by title and ID. It sorts listings by title and ID. It uses
the same order for listing IDs in a list.

`list.slug` is the current Rolling Oaks public catalog path segment. The
builder uses the exact current rule:

```js
title.toLowerCase().replace(/\s+/g, "-");
```

This preserves existing apostrophes and trailing hyphens. The builder rejects
duplicate slugs, the reserved values `all`, `for-sale`, and `search`, and slugs
that contain `/`, `?`, `#`, or `%`. It does not invent a collision suffix.

## Visibility rules

The artifact builder reads the dedicated, synced source replica. The request
route does not connect to Prisma, the source replica, or Turso. It returns only
public lists and public listings for the requested seller. It does not apply a
subscription rule. A dedicated seller storefront can show its public data
without a Daylily Catalog Pro subscription.

The API does not return private notes, Clerk identifiers, roles, Stripe data,
subscription state, or key-value data. Profile rich text is sanitized before it
is returned.

## Artifact build and publication

Production must set these runtime values:

```dotenv
PUBLIC_STOREFRONT_ARTIFACT_ROOT=/data/storefronts
PUBLIC_STOREFRONT_SELLER_IDS=3
```

`PUBLIC_STOREFRONT_SELLER_IDS` is the explicit publication allowlist. It uses
comma-separated, nonempty user IDs. Duplicate IDs are invalid. The builder does
not discover sellers. The request route serves only seller entries in the
published manifest. One or more `--seller-id` options can supply the complete
allowlist for a manual build instead of the environment value.

On the current dedicated-source branch, prepare one source replica and then run
the one-shot builder. The following command runs in the deployed container and
uses the environment from the `app` service:

```sh
cd /srv/stacks/daylilycatalog
docker compose exec -T app sh -eu -c '
  mkdir -p "$PUBLIC_STOREFRONT_ARTIFACT_ROOT"
  node apps/main/scripts/sync-public-search-source-replica.mjs \
    --source "$PUBLIC_STOREFRONT_ARTIFACT_ROOT/source-replica.sqlite"
  node apps/main/scripts/build-public-storefront-artifacts.mjs \
    --source "$PUBLIC_STOREFRONT_ARTIFACT_ROOT/source-replica.sqlite" \
    --output "$PUBLIC_STOREFRONT_ARTIFACT_ROOT"
'
```

The sync command creates or updates its own local libSQL replica from the remote
`DATABASE_URL`. It also runs `PRAGMA quick_check`. It does not copy or open the
normal `TURSO_EMBEDDED_REPLICA_URL` file. The builder rejects that live embedded
replica, including hard-link and symbolic-link aliases, and rejects remote
database URLs. The source sync must finish before Prisma opens the source. This
gives the build one stable file and keeps its paged read from competing with the
normal embedded-replica owner.

Source acquisition is isolated from snapshot mapping and atomic publication.
The one-replica integration can replace this first command with a completed
`syncEmbeddedReplica()` plus bounded source paging. The public mapper, artifact
format, and publication contract do not depend on how the rows arrive.

The builder processes sellers serially. It writes immutable JSON files with an
address bound to the seller ID and exact body bytes. A token-owned lease and
heartbeat permit one publisher. Every artifact and manifest commit verifies
lease ownership. The manifest rename and parent-directory sync are the commit
point. A handled failure before that sync restores the prior manifest and
removes files created by the failed attempt. A failure after the durable commit
is recoverable housekeeping: the command reports a warning and still returns
success because the new manifest is active. The builder disconnects Prisma and
exits, which releases the build memory.

A successful JSON result has `ready: true`, the build `generatedAt`, the
published sellers, any housekeeping warnings, and the artifact root. Treat only
an exit status of zero with `ready: true` as a completed publication.

Run an initial successful sync and build before the endpoint receives traffic.
Every 24 hours, run the source sync to completion, require its `ok: true`
result, and then run the builder. Do not run the two commands concurrently. If
either command fails, keep the prior manifest and alert the owner. If the
manifest does not exist, the route returns `503` and does not build data during
the request. The storefront health endpoint classifies a usable artifact as
degraded after 26 hours but continues to serve it. This branch does not install
or enable a production scheduler.

Before publication, the builder refreshes the retention clock for every object
in the prior manifest. After the new manifest is durable, it removes only
unreferenced objects whose retention clock is more than seven days old. A
request that opened the prior manifest therefore has a seven-day grace period
to open and read its object.

After the new manifest is active, the future 24-hour job must purge cache tags
in this order:

1. Purge `daylily-storefront-data` in the Daylily Catalog API zone.
2. Purge `daylily-storefront-public-html` in the affected storefront zone.

The job must run purges only after the builder returns zero with `ready: true`.
It must alert on a failed publication or purge. This branch does not add purge
credentials, a scheduler, or live purge calls.

## Cache contract

A `200` or `304` response has these headers:

```http
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=86400, stale-while-revalidate=604800, stale-if-error=86400
Cache-Tag: daylily-storefront-data
ETag: W/"<sha-256-base64url>"
```

Cloudflare can cache the response for 24 hours. A browser can store the response
but must validate it. The ETag is a weak SHA-256 validator for the complete JSON
representation. A matching `If-None-Match` header returns `304` with no body.
After the fresh window, Cloudflare can serve stale data for seven days while it
revalidates. It can serve stale data for one day during an origin error.
The deployed header-driven Cloudflare Cache Rule must make this route eligible.
The response header does not change edge infrastructure by itself.

`generatedAt` is the artifact build time, not the edge-cache fill time. The
publish-time tag purge is required. Without it, a quiet URL can retain an old
artifact that was already almost 24 hours old, retain that response for another
24-hour edge fresh window, and then use the seven-day stale-while-revalidate
window. In the worst case, users can receive data that is almost nine days old.
The daily publication target and the purge keep artifact freshness and edge
freshness from compounding.

Cloudflare consumes the origin `Cache-Tag` header and uses the tag for targeted
purges. The future job must send the API tag to the API zone before it purges
the storefront HTML tag in the storefront zone. See Cloudflare's
[purge-by-tag guidance](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/).

The endpoint does not send `Last-Modified`. The implicit list-to-listing relation
has no modification timestamp. A timestamp validator could therefore return an
incorrect `304` after a membership-only change.

This design follows the Cloudflare
[CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
and [ETag](https://developers.cloudflare.com/cache/reference/etag-headers/)
guidance. Conditional request behavior follows
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2).

## Error responses

An unsupported query string or credential-bearing request returns `400`:

```json
{
  "error": "invalid_storefront_request",
  "message": "Query parameters are not supported."
}
```

Credential-bearing requests use the message `Credentials are not supported.`
Cache-bypass requests use the message
`Cache bypass directives are not supported.`

An unknown seller returns `404`:

```json
{
  "error": "storefront_not_found",
  "message": "Storefront not found."
}
```

A missing or invalid manifest, or a missing or invalid artifact for a known
seller, returns `503` with `Retry-After: 30`:

```json
{
  "error": "storefront_unavailable",
  "message": "Storefront data is temporarily unavailable."
}
```

An unexpected failure returns `500`:

```json
{
  "error": "internal_server_error",
  "message": "Storefront could not be loaded."
}
```

Error responses use `Cache-Control: no-store`. They do not send the Cloudflare
cache header. The route never falls back to a request-time database read.
