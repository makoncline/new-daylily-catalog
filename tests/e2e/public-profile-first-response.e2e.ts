import { createAuthedUser } from "../../src/lib/test-utils/e2e-users";
import { withTempE2EDb } from "../../src/lib/test-utils/e2e-db";
import { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } from "../../src/config/constants";
import { test, expect } from "./fixtures/app-fixtures";

const PROFILE_SLUG = "static-first-response-farm";
const PROFILE_TITLE = "Static First Response Farm";
const LISTING_TITLE_PREFIX = "Static First Listing";
const LISTING_COUNT_FOR_TWO_PAGES = PUBLIC_PROFILE_LISTINGS_PAGE_SIZE + 1;

function pad(value: number) {
  return String(value).padStart(3, "0");
}

test.describe("public profile first-response content @local", () => {
  test.beforeAll(async () => {
    await withTempE2EDb(async (db) => {
      const user = await createAuthedUser(db);

      await db.userProfile.create({
        data: {
          userId: user.id,
          slug: PROFILE_SLUG,
          title: PROFILE_TITLE,
          description: "Fixture profile for first-response HTML checks",
          location: "Snohomish, WA",
        },
      });

      for (let i = 1; i <= LISTING_COUNT_FOR_TWO_PAGES; i++) {
        const suffix = pad(i);
        await db.listing.create({
          data: {
            userId: user.id,
            title: `${LISTING_TITLE_PREFIX} ${suffix}`,
            slug: `static-first-listing-${suffix}`,
            description: `Fixture listing ${suffix}`,
            price: i,
          },
        });
      }
    });
  });

  const assertFirstDocumentContent = async (
    html: string,
    expectedListingTitle: string,
  ) => {
    expect(html).toContain(PROFILE_TITLE);
    expect(html).toContain(expectedListingTitle);
    expect(html).toContain('id="listings"');
    expect(html).toContain("Search and filter listings");

    // Guard against shell-only HTML responses that stream core content later.
    expect(html).not.toMatch(/template id="B:\d+"/);
    expect(html).not.toMatch(/<div hidden id="S:\d+"/);
  };

  test("first HTML response contains profile and listing content for page 1 and page 2", async ({
    request,
  }) => {
    const page2FirstListingTitle = `${LISTING_TITLE_PREFIX} ${pad(LISTING_COUNT_FOR_TWO_PAGES)}`;

    const page1Response = await request.get(`/${PROFILE_SLUG}`);
    expect(page1Response.status()).toBe(200);
    const page1Html = await page1Response.text();
    await assertFirstDocumentContent(page1Html, `${LISTING_TITLE_PREFIX} 001`);

    const page2Response = await request.get(`/${PROFILE_SLUG}?page=2`);
    expect(page2Response.status()).toBe(200);
    const page2Html = await page2Response.text();
    await assertFirstDocumentContent(page2Html, page2FirstListingTitle);

    const page1Prerender = page1Response.headers()["x-nextjs-prerender"];
    const page2Prerender = page2Response.headers()["x-nextjs-prerender"];
    if (page1Prerender && page2Prerender) {
      expect(page1Prerender).toContain("1");
      expect(page2Prerender).toContain("1");
    }
  });
});
