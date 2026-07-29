import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_REQUEST_BYTES = 50_000;
const cellSchema = z.string().max(200).nullable();
const mappingIndexSchema = z.number().int().nonnegative().nullable();
const sampleSchema = z
  .object({
    fileType: z.enum(["csv", "xlsx"]),
    headerRowIndex: z.number().int().nonnegative().nullable(),
    importId: z.string().trim().min(1).max(100),
    mapping: z
      .object({
        cultivarReferenceId: mappingIndexSchema,
        description: mappingIndexSchema,
        price: mappingIndexSchema,
        privateNote: mappingIndexSchema,
        title: mappingIndexSchema,
      })
      .strict(),
    resultCounts: z
      .object({
        issueCount: z.number().int().nonnegative(),
        matchedCount: z.number().int().nonnegative(),
        readyCount: z.number().int().nonnegative(),
        reviewCount: z.number().int().nonnegative(),
        rowCount: z.number().int().nonnegative(),
        warningCount: z.number().int().nonnegative(),
      })
      .strict(),
    rows: z
      .array(
        z
          .object({
            cells: z.array(cellSchema).max(30),
            rowNumber: z.number().int().positive(),
          })
          .strict(),
      )
      .max(6),
    sheetCount: z.number().int().positive(),
    sheetName: z.string().max(100),
    source: z.enum(["manual", "sample", "upload"]),
  })
  .strict();

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
    const sample = sampleSchema.parse(JSON.parse(body));
    console.info(
      JSON.stringify({
        event: "catalog_importer_submission_sample",
        ...sample,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Invalid sample." }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
