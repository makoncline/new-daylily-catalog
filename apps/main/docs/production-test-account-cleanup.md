# Production Test Account Cleanup

Use this procedure after an authorized production checkout test with a
dedicated test account. Confirm the account and payment state before each
external or database deletion. This document does not authorize a cleanup run.

## Record the target

Record the test email, app `User.id`, Clerk user ID, Stripe customer and
subscription IDs, and R2 object keys from `ImageAsset` rows owned through the
user's profile or listings. Leave shared cultivar assets out of this cleanup.
Require the app user, Clerk ID, and Stripe customer ID to identify the same
account. Preview rows and counts in `User`, `UserProfile`, `Listing`, `List`,
`_ListToListing`, `Image`, `ImageAsset`, and relevant `KeyValue` cache keys.

## Clean up in order

1. Cancel the Stripe subscription immediately. Confirm its final state and
   inspect payments and pending invoice items before deleting the customer.
2. Confirm the `stripe:customer:<customer-id>` cache reflects the canceled
   subscription, then delete the Stripe customer.
3. Delete the Clerk user. Confirm successful delivery of `user.deleted` to
   `/api/clerk-webhook`. That handler clears `clerk:user:<clerk-id>`; it does
   not delete the app `User` row.
4. Run a fresh, read-only database preview. Require the same three IDs to
   match the target. Record R2 keys before database deletion.
5. Delete the account's app data in one reviewed transaction. Constrain the
   `User` deletion by its app ID, Clerk ID, and Stripe customer ID. Remove
   `_ListToListing`, `Image`, `ImageAsset`, `List`, `Listing`, `UserProfile`,
   the two account cache keys, then `User`. `List.user` and legacy `Image`
   relations do not cascade from `User`.
6. Re-run the preview from a new connection. Require zero target rows and
   cache keys. Then remove only the recorded user-owned R2 objects. Review any
   legacy S3 objects separately.

Verify the Stripe and Clerk deletions, webhook delivery, database counts, and
R2 keys separately. Retained Stripe history can remain after customer deletion.
