import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { DashboardWorkspaceBoundary } from "@/components/dashboard-workspace-boundary";
import { UnsupportedSafariNotice } from "@/components/unsupported-safari-notice";

export const metadata: Metadata = {
  title: "Daylily Catalog",
  description: "A platform for daylily growers to showcase their collections",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="flex min-h-svh flex-col">
        <UnsupportedSafariNotice />
        <DashboardWorkspaceBoundary>{children}</DashboardWorkspaceBoundary>
        <Toaster />
      </body>
    </html>
  );
}
