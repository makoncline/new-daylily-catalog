import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ClerkUserProfileDialog } from "@/components/clerk-user-profile-dialog";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Daylily Catalog",
  description: "",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ClerkProvider>
        <TRPCReactProvider>
          <html lang="en" className={`${GeistSans.variable}`}>
            <body className="flex min-h-svh flex-col">
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster />
              <ClerkUserProfileDialog />
              <SpeedInsights />
            </body>
          </html>
        </TRPCReactProvider>
      </ClerkProvider>
    </>
  );
}
