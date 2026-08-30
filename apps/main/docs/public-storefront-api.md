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

## Success response

The response status is `200`. Dates use ISO 8601 strings.

```ts
interface PublicStorefrontSnapshot {
  version: 1;
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

The read uses the replica database. The API returns only public lists and public
listings for the requested seller. It does not apply a subscription rule. A
dedicated seller storefront can show its public data without a Daylily Catalog
Pro subscription.

The API does not return private notes, Clerk identifiers, roles, Stripe data,
subscription state, or key-value data. Profile rich text is sanitized before it
is returned.

## Cache contract

A `200` or `304` response has these headers:

```http
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=86400
ETag: W/"<sha-256-base64url>"
```

Cloudflare can cache the response for 24 hours. A browser can store the response
but must validate it. The ETag is a weak SHA-256 validator for the complete JSON
representation. A matching `If-None-Match` header returns `304` with no body.
The deployed header-driven Cloudflare Cache Rule must make this route eligible.
The response header does not change edge infrastructure by itself.

The endpoint does not send `Last-Modified`. The implicit list-to-listing relation
has no modification timestamp. A timestamp validator could therefore return an
incorrect `304` after a membership-only change.

This design follows the Cloudflare
[CDN-Cache-Control](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
and [ETag](https://developers.cloudflare.com/cache/reference/etag-headers/)
guidance. Conditional request behavior follows
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2).

## Error responses

An unknown seller returns `404`:

```json
{
  "error": "storefront_not_found",
  "message": "Storefront not found."
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
cache header.
