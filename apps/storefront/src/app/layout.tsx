import type { Metadata, Viewport } from "next";
import { connection } from "next/server";

import { Providers } from "@/components/layout/providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const site = getStorefrontSiteConfig();
  return {
    metadataBase: new URL(site.canonicalUrl),
    title: {
      default: site.brand.title,
      template: `%s | ${site.brand.shortName}`,
    },
    description: site.brand.description,
    openGraph: {
      type: "website",
      siteName: site.brand.name,
      title: site.brand.title,
      description: site.brand.description,
      ...(site.brand.socialImage
        ? {
            images: [
              {
                url: site.brand.socialImage.path,
                width: site.brand.socialImage.width,
                height: site.brand.socialImage.height,
                type: site.brand.socialImage.type,
                alt: `${site.brand.name} logo`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: site.brand.title,
      description: site.brand.description,
      ...(site.brand.socialImage
        ? { images: [site.brand.socialImage.path] }
        : {}),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  await connection();
  const site = getStorefrontSiteConfig();
  return {
    themeColor: site.brand.themeColor,
    colorScheme: "light",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const site = getStorefrontSiteConfig();
  const organization = {
    "@context": "https://schema.org",
    "@type": "GardenStore",
    name: site.brand.name,
    url: site.canonicalUrl,
    description: site.brand.description,
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
  };

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col antialiased">
        <Providers siteKey={site.key} shippingPolicy={site.commerce.shipping}>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <SiteHeader siteName={site.brand.shortName} />
          <main
            id="main-content"
            className="mx-auto w-full max-w-7xl flex-1 px-4 lg:px-8"
          >
            {children}
          </main>
          <SiteFooter siteName={site.brand.name} />
        </Providers>
        <JsonLd value={organization} />
      </body>
    </html>
  );
}
