import { NextResponse } from "next/server";
import { parse, type HTMLElement } from "node-html-parser";

// Helper function to fetch and parse metadata
async function fetchMetadata(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  const root = parse(html);

  // Get meta tags
  const metaTags = root.querySelectorAll("meta");
  const getMetaContent = (name: string) => {
    const tag = metaTags.find(
      (tag: HTMLElement) =>
        tag.getAttribute("name") === name ||
        tag.getAttribute("property") === `og:${name}`,
    );
    return tag ? tag.getAttribute("content") : "";
  };

  // Extract metadata
  const title =
    root.querySelector("title")?.text ||
    getMetaContent("title") ||
    getMetaContent("og:title") ||
    "";

  const description =
    getMetaContent("description") || getMetaContent("og:description") || "";

  const image = getMetaContent("og:image") || getMetaContent("image") || "";

  // Validate the image URL
  let validatedImageUrl = image;
  if (image && !image.startsWith("http")) {
    const urlObj = new URL(url);
    validatedImageUrl = new URL(image, urlObj.origin).toString();
  }

  return {
    title: title.trim(),
    description: description.trim(),
    image: {
      url: validatedImageUrl,
    },
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        {
          success: 0,
          message: "URL parameter is required",
        },
        { status: 400 },
      );
    }

    const meta = await fetchMetadata(url);

    return NextResponse.json({
      success: 1,
      meta,
    });
  } catch (error) {
    console.error("Error fetching link metadata:", error);
    return NextResponse.json(
      {
        success: 0,
        message: "Could not fetch link metadata",
      },
      { status: 422 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const meta = await fetchMetadata(url);

    return NextResponse.json({
      success: 1,
      meta,
    });
  } catch (error) {
    console.error("Error fetching link metadata:", error);
    return NextResponse.json(
      {
        success: 0,
        message: "Could not fetch link metadata",
      },
      { status: 422 },
    );
  }
}
