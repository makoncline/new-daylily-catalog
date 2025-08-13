import { clerkSetup } from "@clerk/testing/playwright";
import * as dotenv from "dotenv";
import path from "path";

export default async function globalSetup() {
  // Load .env.test so Clerk keys are available in the test runner
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

  // Map common Next.js env var names to what @clerk/testing expects
  if (
    !process.env.CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    process.env.CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }
  if (
    !process.env.CLERK_FRONTEND_API &&
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
  ) {
    process.env.CLERK_FRONTEND_API = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  }
  // CLERK_SECRET_KEY should already be present in .env.test

  await clerkSetup();
}
