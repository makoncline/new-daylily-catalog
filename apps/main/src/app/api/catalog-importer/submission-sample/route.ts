import { NextResponse } from "next/server";

const MAX_REQUEST_BYTES = 300_000;

export async function POST(request: Request) {
  if (process.env.CATALOG_IMPORTER_SAMPLE_LOGGING_ENABLED === "false") {
    return new NextResponse(null, { status: 204 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "Sample is too large." },
      { status: 413 },
    );
  }

  try {
    const body = await request.text();
    if (body.length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Sample is too large." },
        { status: 413 },
      );
    }
    const sample: unknown = JSON.parse(body);
    console.info("catalog_importer_submission_sample", sample);
  } catch {
    return NextResponse.json({ error: "Invalid sample." }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
