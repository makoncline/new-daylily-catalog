# Production Checkout Test Cleanup

Use this after completing a real production onboarding and Stripe checkout with
a dedicated test email address.

## Record Identifiers

Before deleting anything, record:

- test email
- app `User.id`
- Clerk user ID
- Stripe customer and subscription IDs
- R2 keys referenced by the user's `ImageAsset` rows

## Cleanup Order

1. In Stripe, cancel the subscription **immediately**. Confirm it is canceled,
   no payment was collected, and no pending invoice items exist.
2. Confirm the app's `stripe:customer:<customerId>` cache has status `none`,
   then delete the Stripe customer.
3. Delete the Clerk user. Confirm the production Clerk webhook reports a
   successful `user.deleted` delivery.
4. Run a read-only Turso preview that lists every matching row and count.
5. Delete the app data in one guarded transaction, then rerun the preview and
   require every count to be zero.
6. Delete the user's R2 image prefix. Legacy S3 cleanup is optional when those
   objects are intentionally being retained.

## Turso Preview

The preview must show exactly one `User` row where the Clerk and Stripe IDs
match the same record. Include these tables:

```text
User
UserProfile
Listing
List
_ListToListing
Image
ImageAsset
KeyValue
```

Also print full `ImageAsset` keys before deletion so object cleanup remains
possible after database rows are gone.

## Turso Deletion

Use a transaction and constrain the target by all three identifiers:

```sql
WHERE "id" = '<app-user-id>'
  AND "clerkUserId" = '<clerk-user-id>'
  AND "stripeCustomerId" = '<stripe-customer-id>'
```

Delete in this order:

```text
_ListToListing
Image
ImageAsset
List
Listing
UserProfile
clerk:user:<clerkUserId> cache
stripe:customer:<stripeCustomerId> cache
User
```

`List.user` does not cascade, while legacy `Image` relations can become
orphaned, so do not rely only on deleting `User`.

## Clerk Requirement

Production Clerk must have an active endpoint at:

```text
https://daylilycatalog.com/api/clerk-webhook
```

Subscribe it to `user.created`, `user.updated`, `user.deleted`, and
`session.created`. Its signing secret must match `CLERK_WEBHOOK_SECRET` on the
server. A safe `user.deleted` example should succeed without creating an app
user or cache row.

## Final Verification

- Stripe subscription is canceled and customer is deleted.
- Clerk user is deleted and its webhook delivery succeeded.
- Turso preview returns zero rows for every cleanup table and cache key.
- The user-specific R2 prefix is gone.
- Stripe may retain historical `$0` invoice and event records by design.
