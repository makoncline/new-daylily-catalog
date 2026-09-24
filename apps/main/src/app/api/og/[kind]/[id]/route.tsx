import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { PublicSocialCard } from "@/components/public-social-card";
import { CultivarSocialCard } from "@/components/cultivar-social-card";
import { reportError } from "@/lib/error-utils";
import { isSocialCardKind, SOCIAL_CARD_SIZE } from "@/lib/social-card";
import { getPublicCloudflareCacheHeaders } from "@/lib/public-cache-policy";
import { getPublicCultivarSocialCardData } from "@/server/db/public-cultivar-social-card-read-model";
import { getErrorCode } from "@/lib/utils";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { getPublicSocialCardData } from "@/server/db/public-social-card-read-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

let cultivarFontPromise: Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }>
> | null = null;

function getCultivarFonts() {
  cultivarFontPromise ??= (async () => {
    const appDir = process.cwd().endsWith("apps/main")
      ? process.cwd()
      : join(process.cwd(), "apps/main");
    const fontDir = join(appDir, "public/fonts");
    const [regular, bold] = await Promise.all([
      readFile(join(fontDir, "geist-regular.ttf")),
      readFile(join(fontDir, "geist-bold.ttf")),
    ]);

    return [
      {
        name: "Geist",
        data: regular.buffer.slice(
          regular.byteOffset,
          regular.byteOffset + regular.byteLength,
        ),
        weight: 400 as const,
        style: "normal" as const,
      },
      {
        name: "Geist",
        data: bold.buffer.slice(
          bold.byteOffset,
          bold.byteOffset + bold.byteLength,
        ),
        weight: 700 as const,
        style: "normal" as const,
      },
    ];
  })();

  return cultivarFontPromise;
}

async function prepareImageForSatori(source: string, requestUrl: string) {
  const safeSource = getOptimizedMetaImageUrl(source);
  const absoluteSource = new URL(safeSource, requestUrl).toString();
  const response = await fetch(absoluteSource, {
    cache: "force-cache",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`Social image source returned ${response.status}`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_SOURCE_IMAGE_BYTES
  ) {
    throw new Error("Social image source exceeds the size limit");
  }

  const sourceImage = Buffer.from(await response.arrayBuffer());
  if (sourceImage.byteLength > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Social image source exceeds the size limit");
  }

  const jpeg = await sharp(sourceImage, {
    failOn: "warning",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      width: 900,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 84 })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

async function prepareSocialCardImages(
  imageUrls: string[],
  requestUrl: string,
) {
  const results = await Promise.allSettled(
    imageUrls.map((imageUrl) => prepareImageForSatori(imageUrl, requestUrl)),
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}

function errorResponse(status: 404 | 500, message: string) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": status === 404 ? "public, max-age=60" : "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;

  if (!isSocialCardKind(kind) || !id) {
    return errorResponse(404, "Social image not found");
  }

  try {
    if (kind === "cultivar") {
      const cultivar = await getPublicCultivarSocialCardData(id);
      if (!cultivar) return errorResponse(404, "Social image not found");

      const [imageUrl] = await prepareSocialCardImages(
        cultivar.imageUrls,
        request.url,
      );
      const fonts = await getCultivarFonts();
      const variant =
        new URL(request.url).searchParams.get("variant") === "print"
          ? "print"
          : "share";

      return new ImageResponse(
        (
          <CultivarSocialCard
            title={cultivar.title}
            ahsListing={cultivar.ahsListing}
            extraDetails={cultivar.extraDetails}
            imageUrl={imageUrl}
            variant={variant}
          />
        ),
        {
          ...SOCIAL_CARD_SIZE,
          fonts,
          headers: getPublicCloudflareCacheHeaders({
            "Cache-Control": "public, max-age=300",
          }),
        },
      );
    }

    const publicData = await getPublicSocialCardData(kind, id);
    const imageUrls = await prepareSocialCardImages(
      publicData.imageUrls,
      request.url,
    );
    const data = { ...publicData, imageUrls };

    return new ImageResponse(<PublicSocialCard data={data} />, {
      ...SOCIAL_CARD_SIZE,
      headers: {
        "Cache-Control": "public, max-age=300",
        "Cloudflare-CDN-Cache-Control":
          "public, max-age=900, stale-while-revalidate=86400, stale-if-error=86400",
      },
    });
  } catch (error) {
    if (getErrorCode(error) === "NOT_FOUND") {
      return errorResponse(404, "Social image not found");
    }

    reportError({
      error,
      context: {
        source: "public-social-card",
        kind,
        id,
      },
    });

    return errorResponse(500, "Failed to generate social image");
  }
}
