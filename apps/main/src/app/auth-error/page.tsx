import type { Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";
import { AuthErrorPageClient } from "./auth-error-page-client";

export const metadata: Metadata = {
  title: `Authentication Required | ${METADATA_CONFIG.SITE_NAME}`,
  description: "Sign in to continue to your Daylily Catalog dashboard.",
};

export default function AuthErrorPage() {
  return <AuthErrorPageClient />;
}
