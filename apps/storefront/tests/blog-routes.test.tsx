import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const jsonLdState = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/components/layout/link-button", async () => {
  const React = await import("react");
  return {
    LinkButton: ({
      children,
      href,
    }: {
      children: React.ReactNode;
      href: string;
    }) => React.createElement("a", { href }, children),
  };
});
vi.mock("@/components/seo/json-ld", async () => {
  const React = await import("react");
  return {
    JsonLd: ({ value }: { value: unknown }) => {
      jsonLdState.value = value;
      return React.createElement("script", {
        type: "application/ld+json",
      });
    },
  };
});

import BlogPage, {
  generateMetadata as generateBlogMetadata,
} from "@/app/blog/page";
import DorothyAndTotoPage, {
  generateMetadata as generateArticleMetadata,
} from "@/app/blog/dorothy-and-toto/page";

describe("storefront blog routes", () => {
  it("keeps the original article on the blog index with canonical metadata", async () => {
    const html = renderToStaticMarkup(await BlogPage());
    const metadata = await generateBlogMetadata();

    expect(html).toContain('href="/blog/dorothy-and-toto"');
    expect(html).toContain(
      "Learn about the background, garden performance, characteristics, and awards",
    );
    expect(metadata).toMatchObject({
      title: "Blog",
      alternates: { canonical: "/blog" },
      openGraph: {
        type: "website",
        url: "/blog",
      },
    });
  });

  it("renders the text-only article with article metadata and BlogPosting data", async () => {
    const html = renderToStaticMarkup(await DorothyAndTotoPage());
    const metadata = await generateArticleMetadata();

    expect(html).toContain("Background History");
    expect(html).toContain("Original photo captions");
    expect(html).toContain(
      "A close-up of the beautiful blooms of the Dorothy and Toto daylily.",
    );
    expect(html).not.toContain("garden.org");
    expect(metadata).toMatchObject({
      title: "Dorothy and Toto",
      alternates: { canonical: "/blog/dorothy-and-toto" },
      openGraph: {
        type: "article",
        url: "/blog/dorothy-and-toto",
      },
    });
    expect(metadata.openGraph).not.toHaveProperty("publishedTime");
    expect(metadata.openGraph).not.toHaveProperty("authors");
    expect(jsonLdState.value).toMatchObject({
      "@type": "BlogPosting",
      headline: "Dorothy and Toto",
      url: "https://rollingoaksdaylilies.com/blog/dorothy-and-toto",
    });
    expect(jsonLdState.value).not.toHaveProperty("datePublished");
    expect(jsonLdState.value).not.toHaveProperty("author");
  });
});
