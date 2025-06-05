import { test, expect } from './fixtures';

const userEmail = 'test_playwright+clerk_test@gmail.com';

async function signIn(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email address').fill(userEmail);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1000);
  await page.waitForSelector('#digit-0-field');
  await page.keyboard.type('424242');
  await page.waitForURL('/');
}

test('create, edit listing and paginate', async ({ page, db }) => {
  await signIn(page);
  await page.goto('/dashboard/listings');

  // check pagination shows two pages
  await expect(page.getByText('Page 1 of 2')).toBeVisible();

  // create listing
  await page.getByRole('button', { name: 'Create Listing' }).click();
  await page.getByLabel('Listing Title').fill('Playwright Listing');
  await page.getByRole('button', { name: 'Create Listing' }).click();

  // edit dialog should open automatically
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Name').fill('Updated Listing');
  await page.getByLabel('Price').fill('99');
  await page.getByLabel('Public Note').fill('Updated note');
  await page.getByLabel('Private Note').fill('Private');
  await page.getByLabel('Private Note').blur();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog').locator('text=Edit Listing')).not.toBeVisible();

  const listing = await db.listing.findFirst({ where: { title: 'Updated Listing' } });
  expect(listing?.price).toBe(99);

  // pagination: go to next page and back
  await page.getByRole('button', { name: 'Go to next page' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});
