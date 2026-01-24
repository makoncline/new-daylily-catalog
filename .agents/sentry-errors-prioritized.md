# Sentry Error Issues - Prioritized

This document tracks high-priority errors from Sentry, organized by severity and impact.

## ✅ Completed

### [NEW-DAYLILY-CATALOG-2N] AbortError: The operation was aborted
**Status:** ✅ Fixed  
**PR:** (local) commit `9d01a34`  
**Events:** 61  
**Last Seen:** 1 day ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** Medium

**Issue:** Safari-heavy AbortErrors from query cancellation on listing detail pages. Public breadcrumbs refetched listing data on the client even when server-rendered data already existed.

**Solution:**
- Pass listing title into `PublicBreadcrumbs` and skip the listing query when already provided
- Filter AbortErrors in Sentry `beforeSend` and record a breadcrumb instead of creating an issue
- Add unit tests to ensure the listing query is disabled when listing data is present

**Status:** Fixed in branch `fix/sentry-abort-breadcrumbs` (pending merge)

---

### [NEW-DAYLILY-CATALOG-Z] Failed to load optimized image resource
**Status:** ✅ Fixed  
**PR:** [#25](https://github.com/makoncline/new-daylily-catalog/pull/25)  
**Events:** 1,179  
**Last Seen:** 1 minute ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** Highest

**Issue:** Images with spaces or special characters in URLs (e.g., `witches poison apple.jpg`) were failing to load through Cloudflare image optimization.

**Solution:**
- URL-encode source URLs in Cloudflare loader
- Add fallback to original `src` if optimized URL fails
- Deduplicate error reporting per image URL to reduce Sentry noise

**Status:** Fixed in PR #25

---

### [NEW-DAYLILY-CATALOG-2J] ZodError
**Status:** ✅ Fixed  
**Events:** 110  
**Last Seen:** 10 minutes ago  
**Culprit:** `/:userSlugOrId`  
**Priority:** High

**Issue:** Unhandled promise rejections from Zod validation errors in the contact form. The form was using `zodResolver` with `mode: "onChange"`, which caused validation errors to be thrown as unhandled promise rejections when:
- Form initialized with invalid default values
- Cart items changed and `void form.trigger("message")` was called
- Fields were changed with invalid values

**Solution:**
- Changed validation mode to `onBlur` with `reValidateMode: onChange` to validate on blur instead of every keystroke
- Updated cart items useEffect to use `shouldValidate: true` option when setting `hasItems`
- Added unit tests to verify no unhandled promise rejections occur during validation
- Validation errors are now properly handled as field errors instead of thrown exceptions

**Status:** Fixed in branch `fix/contact-form-validation-error` (merged)

---

### [NEW-DAYLILY-CATALOG-2H] ZodError
**Status:** ✅ Fixed  
**Events:** 35  
**Last Seen:** 1 day ago  
**Culprit:** `/:userSlugOrId`  
**Priority:** High

**Issue:** Zod validation error on user catalog pages - same root cause as NEW-DAYLILY-CATALOG-2J. Unhandled promise rejections from Zod validation errors in the contact form.

**Solution:**
- Fixed by the same solution as NEW-DAYLILY-CATALOG-2J
- Changed validation mode to `onBlur` with `reValidateMode: onChange`
- Updated cart items useEffect to use `shouldValidate: true` option
- Validation errors are now properly handled as field errors instead of thrown exceptions

**Status:** Fixed in branch `fix/contact-form-validation-error` (merged)

---

## 🔴 High Priority

### [NEW-DAYLILY-CATALOG-2M] ZodError
**Status:** 🔴 Unresolved  
**Events:** 37  
**Last Seen:** 7 days ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** High

**Issue:** Zod validation errors on listing detail pages.

**Next Steps:**
- Investigate listing route validation
- Check if related to AHS listing data integration

---

## 🟡 Medium Priority

### [NEW-DAYLILY-CATALOG-2P] AbortError: Fetch is aborted
**Status:** 🟡 Unresolved  
**Events:** 54  
**Last Seen:** 2 days ago  
**Culprit:** `/:userSlugOrId`  
**Priority:** Medium

**Issue:** Fetch requests being aborted on user catalog pages.

**Next Steps:**
- Similar to NEW-DAYLILY-CATALOG-2N - investigate abort patterns
- Check if related to React Query or tRPC request cancellation

---

### [NEW-DAYLILY-CATALOG-2Q] AbortError: abort pipeTo from signal
**Status:** 🟡 Unresolved  
**Events:** 37  
**Last Seen:** 2 days ago  
**Culprit:** `/:userSlugOrId`  
**Priority:** Medium

**Issue:** Stream/pipe operations being aborted.

**Next Steps:**
- Investigate streaming operations (image loading, data fetching)
- Check if related to Cloudflare image optimization

---

### [NEW-DAYLILY-CATALOG-2S] Server Components render error
**Status:** 🟡 Unresolved  
**Events:** 89  
**Last Seen:** 15 days ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** Medium

**Issue:** Server Components render errors with digest omitted in production.

**Next Steps:**
- Check production error logs for digest details
- Review Server Component error boundaries
- Investigate specific listing pages causing issues

---

### [NEW-DAYLILY-CATALOG-2R] Failed to load chunk
**Status:** 🟡 Unresolved  
**Events:** 113  
**Last Seen:** 24 days ago  
**Culprit:** `/:userSlugOrId`  
**Priority:** Medium

**Issue:** Next.js chunk loading failures (`/_next/static/chunks/c64fafb477793db2.js`).

**Next Steps:**
- Check if chunk still exists in current build
- Review Next.js build configuration
- May be resolved with recent deployments

---

## 🟢 Lower Priority

### [NEW-DAYLILY-CATALOG-39] e.from
**Status:** 🟢 Unresolved  
**Events:** 40  
**Last Seen:** 11 days ago  
**Culprit:** `/dashboard/listings`  
**Priority:** Low

**Issue:** Unclear error message - `e.from` suggests a property access error.

**Next Steps:**
- Investigate dashboard listings page
- Check error context in Sentry for more details
- Review code around `.from` property access

---

### [NEW-DAYLILY-CATALOG-30] Error: Connection closed
**Status:** 🟢 Unresolved  
**Events:** 2  
**Last Seen:** 13 days ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** Low

**Issue:** Connection closed errors - likely network-related.

**Next Steps:**
- Low event count suggests transient network issues
- Monitor if frequency increases
- May be user-side network problems

---

### [NEW-DAYLILY-CATALOG-2T] <unknown>
**Status:** 🟢 Unresolved  
**Events:** 10  
**Last Seen:** 19 days ago  
**Culprit:** `/:userSlugOrId/:listingSlugOrId`  
**Priority:** Low

**Issue:** Unknown error type - needs investigation.

**Next Steps:**
- Review Sentry event details for more context
- Check if error message is being captured properly
- Low priority due to low event count

---

## Summary

- **Total Issues:** 12
- **Fixed:** 4 (NEW-DAYLILY-CATALOG-Z, NEW-DAYLILY-CATALOG-2J, NEW-DAYLILY-CATALOG-2H, NEW-DAYLILY-CATALOG-2N)
- **High Priority:** 1 (ZodError on listing pages)
- **Medium Priority:** 5 (AbortErrors, Server Component errors, chunk loading)
- **Low Priority:** 3 (Unclear errors, low event counts)

## Next Steps

1. **Investigate remaining ZodError issue** - NEW-DAYLILY-CATALOG-2M on listing detail pages still needs investigation
2. **Review AbortError patterns** - Determine if these are expected or need handling
3. **Monitor chunk loading** - May be resolved with recent deployments
4. **Clarify unclear errors** - Get more context on `e.from` and `<unknown>` errors
