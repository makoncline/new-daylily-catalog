import type { Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";
import { SentryExamplePageClient } from "./sentry-example-page-client";

export const metadata: Metadata = {
  title: `Sentry Example | ${METADATA_CONFIG.SITE_NAME}`,
  description: "Internal Sentry instrumentation test page.",
};

export default function SentryExamplePage() {
  return <SentryExamplePageClient />;
}
