# E2E Test Setup

This directory contains the E2E test setup for the Daylily Catalog application using Playwright.

## Overview

The test setup provides:
- ✅ **Isolated databases**: Each test runs with a fresh SQLite database
- ✅ **Consistent test data**: Seeded with realistic daylily data
- ✅ **Clerk authentication**: Pre-configured test user
- ✅ **Stripe integration**: Mock customer data in key-value store
- ✅ **Server isolation**: Each test starts its own development server

## Test User

All tests use a consistent test user:
- **Email**: `makon+clerk_test@hey.com`
- **Clerk ID**: `user_2w3b2W7whoLxAHDAWrepBRzESgc`
- **Stripe Customer ID**: `cus_test_daylily_catalog`

## File Structure

```
tests/
├── fixtures.ts           # Playwright fixtures for database and server setup
├── test-utils.ts          # Database and server utilities
├── auth-utils.ts          # Clerk authentication helpers
├── dashboard-flow.test.ts # Complete dashboard workflow test
└── README.md             # This file
```

## Key Components

### `fixtures.ts`
Extends Playwright's base test with custom fixtures:
- `db`: PrismaClient connected to isolated test database
- `serverUrl`: URL of test server instance
- `testUser`: Test user constants
- `page`: Page with automatic URL prefixing

### `test-utils.ts`
Core utilities for test infrastructure:
- `createTestDatabase()`: Creates isolated SQLite database
- `setupTestDatabase()`: Applies schema and seeds data
- `waitForServer()`: Waits for server to be ready
- `killProcessOnPort()`: Cleans up server processes

### `auth-utils.ts`
Clerk authentication helpers:
- `setupClerkAuth()`: Authenticates test user via UI flow
- `setupClerkAuthWithTokens()`: Direct token-based auth (alternative)
- `clearClerkAuth()`: Removes authentication data
- `waitForAuthentication()`: Waits for auth completion

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests with UI mode
npm run test:ui

# Run specific test file
npx playwright test tests/basic.test.ts
```

## Test Data

Each test database is seeded with:
- 1 test user with profile
- 3 lists: "My Garden", "For Sale", "Favorites"
- 5 test listings with realistic data
- 2 AHS cultivar entries
- Stripe customer data in key-value store

## Authentication Setup

The test setup handles Clerk authentication in two ways:

1. **UI Flow** (recommended): Uses `setupClerkAuth()` to sign in through Clerk's UI
2. **Token-based**: Uses `setupClerkAuthWithTokens()` to set tokens directly

### Setting up Clerk Test User

You need to create the test user in your Clerk dashboard:
1. Go to Clerk Dashboard > Users
2. Create user with email `makon+clerk_test@hey.com`
3. Note the user ID (should match `user_2w3b2W7whoLxAHDAWrepBRzESgc`)
4. Set a password for UI-based login tests

## Stripe Test Data

Stripe customer data is stored in the database's `KeyValue` table with key `stripe_customer_cus_test_daylily_catalog`. The mock data includes:
- Customer information
- Active subscription
- Subscription end date (30 days from test run)

## Database Isolation

Each test gets a completely fresh database:
1. Creates unique SQLite file in `test-results/`
2. Applies Prisma schema with `prisma db push`
3. Seeds with test data using `prisma/test-seed.ts`
4. Cleans up database file after test completion

## Server Isolation

Each test starts its own Next.js development server:
1. Kills any existing process on port 3000
2. Starts `npm run dev` with test database URL
3. Waits for server ready signal
4. Runs test against isolated server
5. Cleans up server process after test

## Troubleshooting

### Tests hanging or timing out
- Check that port 3000 is available
- Ensure test database seeding completes successfully
- Verify Clerk test user exists and is accessible

### Authentication failures
- Verify test user exists in Clerk dashboard
- Check that Clerk environment variables are set correctly
- Try using token-based auth instead of UI flow

### Database errors
- Ensure Prisma schema is up to date
- Check that test-seed.ts runs without errors
- Verify SQLite file permissions in test-results directory

## Best Practices

1. **Use the fixtures**: Always import `test` and `expect` from `./fixtures`
2. **Set up auth in beforeEach**: Use `setupClerkAuth()` in test setup
3. **Verify database state**: Use the `db` fixture to check data persistence
4. **Clean selectors**: Use data-testid attributes for reliable element selection
5. **Realistic test data**: Use meaningful daylily names and descriptions

## Complete Dashboard Flow Test

The single test file `dashboard-flow.test.ts` covers the entire user workflow:

1. **Login**: Clicks Dashboard button, handles Clerk modal authentication
2. **Create Listing**: Navigates to listings, creates new listing with details
3. **Search**: Searches for the created listing in the dashboard
4. **Edit**: Opens edit modal, updates listing details
5. **Database Verification**: Confirms changes are saved correctly
6. **Cleanup**: Removes test data

Run with:
```bash
npm run test tests/dashboard-flow.test.ts
```

This comprehensive test ensures the core functionality works end-to-end with proper authentication, database isolation, and realistic user interactions.