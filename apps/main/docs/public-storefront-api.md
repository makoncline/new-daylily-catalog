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
}
```

The `listings` array contains all public listings for the seller. This includes
listings that are not in a list. A list contains only public listing IDs for the
same seller. Listing images contain the cultivar image as a fallback when the
listing has no image.

The API sorts lists by title and ID. It sorts listings by title and ID. It uses
the same order for listing IDs in a list.

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

Prepare one dedicated source replica, and then run the one-shot builder with all
configured seller IDs:

```sh
mkdir -p /data/storefronts
node apps/main/scripts/sync-public-search-source-replica.mjs \
  --source /data/storefronts/source-replica.sqlite
node apps/main/scripts/build-public-storefront-artifacts.mjs \
  --source /data/storefronts/source-replica.sqlite \
  --output /data/storefronts \
  --seller-id 3
```

The sync command creates or updates its own local libSQL replica from the remote
`DATABASE_URL`. It also runs `PRAGMA quick_check`. It does not copy or open the
normal `TURSO_EMBEDDED_REPLICA_URL` file. The builder rejects that live embedded
replica and remote database URLs. One libSQL client owns an embedded replica;
using a separate file also keeps a long snapshot read from competing with public
page reads or replica sync.

The builder processes sellers serially. It writes immutable JSON files with an
address bound to the seller ID and exact body bytes. It then publishes one
manifest with a same-directory atomic rename. A failed build leaves the prior
manifest active. The builder disconnects Prisma and exits, which releases the
build memory.

Run an initial successful sync and build before the endpoint receives traffic.
Every 24 hours, run the source sync to completion, require its `ok: true`
result, and then run the builder. Do not run the two commands concurrently. If
either command fails, keep the prior manifest and alert the owner. If the
manifest does not exist, the route returns `503` and does not build data during
the request. This branch does not install or enable a production scheduler.

Before publication, the builder refreshes the retention clock for every object
in the prior manifest. After the new manifest is durable, it removes only
unreferenced objects whose retention clock is more than seven days old. A
request that opened the prior manifest therefore has a seven-day grace period
to open and read its object.

## Cache contract

A `200` or `304` response has these headers:

```http
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=86400, stale-while-revalidate=604800, stale-if-error=86400
ETag: W/"<sha-256-base64url>"
```

Cloudflare can cache the response for 24 hours. A browser can store the response
but must validate it. The ETag is a weak SHA-256 validator for the complete JSON
representation. A matching `If-None-Match` header returns `304` with no body.
After the fresh window, Cloudflare can serve stale data for seven days while it
revalidates. It can serve stale data for one day during an origin error.
The deployed header-driven Cloudflare Cache Rule must make this route eligible.
The response header does not change edge infrastructure by itself.

`generatedAt` is the artifact build time, not the edge-cache fill time. A build
every 24 hours plus a 24-hour fresh edge TTL can make a response almost 48 hours
old. Purge this URL after a successful publish, or use a shorter build interval,
if the product requires a strict 24-hour maximum data age.

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
