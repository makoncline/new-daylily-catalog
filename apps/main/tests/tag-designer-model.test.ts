import { describe, expect, it } from "vitest";
import {
  BUILTIN_TAG_LAYOUT_TEMPLATES,
  buildResolvedRowsForListing,
  buildQrCodeSvgMarkup,
  buildTagTemplateAiInstructions,
  createLayoutSignature,
  createRowsFromTagTextTemplate,
  findUnknownTagTemplateFields,
  getTagTemplateValidationIssues,
  getTagTextTemplateFieldIds,
  getTagPreviewWarnings,
  sanitizeTagDesignerState,
  tagDesignerStateToTemplateText,
} from "@/app/dashboard/tags/_components/tag-designer-model";
import type {
  TagListingData,
  TagRow,
} from "@/app/dashboard/tags/_components/tag-designer-model";

const listing: TagListingData = {
  id: "listing-1",
  title: "Moonlit Smile",
  price: 18.5,
  ahsListing: {
    hybridizer: "Smith",
    year: "2015",
    ploidy: "Tetraploid",
  },
};

function customTextCell(label: string): TagRow["cells"][number] {
  return {
    fieldId: "customText",
    width: 1,
    textAlign: "left",
    fontSize: 12,
    overflow: false,
    fit: true,
    wrap: false,
    bold: false,
    italic: false,
    underline: false,
    label,
  };
}

describe("tag designer model", () => {
  it("keeps resolved cell ids unique for repeated free-text cells", () => {
    const rows = buildResolvedRowsForListing(listing, [
      {
        id: "row-1",
        cells: [customTextCell("A"), customTextCell("B")],
      },
    ]);

    expect(rows[0]?.cells.map((cell) => cell.id)).toEqual([
      "listing-1-row-1-0-customText",
      "listing-1-row-1-1-customText",
    ]);
  });

  it("renders line templates with the combined hybridizer and year field", () => {
    const rows = buildResolvedRowsForListing(
      listing,
      createRowsFromTagTextTemplate(
        "{{title}}\n{{hybridizerYear}} · {{ploidy}}\n{{price}}",
      ),
    );

    expect(rows.map((row) => row.cells[0]?.text)).toEqual([
      "Moonlit Smile",
      "Smith, 2015 · tet",
      "$18.50",
    ]);
  });

  it("migrates legacy wrapping and overflow cells to shrink-to-fit", () => {
    const legacyCell = customTextCell("A long saved value");
    const state = sanitizeTagDesignerState({
      ...BUILTIN_TAG_LAYOUT_TEMPLATES[0]!.layout,
      rows: [
        {
          id: "legacy-row",
          cells: [
            { ...legacyCell, fit: false, wrap: true },
            { ...legacyCell, fit: false, overflow: true },
          ],
        },
      ],
    });

    expect(state.rows[0]?.cells).toEqual([
      expect.objectContaining({ fit: true, overflow: false, wrap: false }),
      expect.objectContaining({ fit: true, overflow: false, wrap: false }),
    ]);
  });

  it("parses line sizes and space-between columns without wrapping", () => {
    const template =
      "# {{title}}\n## {{hybridizerYear}} | {{ploidy}}\n- {{price}} | {{privateNote}}";
    const rows = createRowsFromTagTextTemplate(template);
    const resolved = buildResolvedRowsForListing(listing, rows);

    expect(rows[0]?.cells[0]).toMatchObject({
      label: "{{title}}",
      fontSize: 22,
      bold: true,
      wrap: false,
    });
    expect(rows[1]?.cells).toHaveLength(2);
    expect(rows[1]?.cells[0]).toMatchObject({
      label: "{{hybridizerYear}}",
      fontSize: 16,
      bold: true,
      wrap: false,
    });
    expect(rows[2]?.cells[0]).toMatchObject({
      fontSize: 11,
      bold: false,
      wrap: false,
    });
    expect(resolved[1]?.cells.map((cell) => cell.text)).toEqual([
      "Smith, 2015",
      "tet",
    ]);
    expect(resolved[2]?.cells.map((cell) => cell.text)).toEqual(["$18.50"]);
    expect(
      tagDesignerStateToTemplateText({
        sizePresetId: "brother-tze-1",
        customWidthInches: 3.5,
        customHeightInches: 1,
        showQrCode: true,
        rows,
      }),
    ).toBe(template);
  });

  it("preserves runs of interior blank lines as row spacing", () => {
    const template = "# {{title}}\n\n\n- {{hybridizerYear}}";
    const rows = createRowsFromTagTextTemplate(template);
    const resolved = buildResolvedRowsForListing(listing, rows);

    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({ isSpacer: true, cells: [] });
    expect(rows[2]).toMatchObject({ isSpacer: true, cells: [] });
    expect(resolved[1]).toMatchObject({ isSpacer: true, cells: [] });
    expect(resolved[2]).toMatchObject({ isSpacer: true, cells: [] });
    expect(
      tagDesignerStateToTemplateText({
        sizePresetId: "brother-tze-1",
        customWidthInches: 3.5,
        customHeightInches: 1,
        showQrCode: true,
        rows,
      }),
    ).toBe(template);
  });

  it("leaves optional-only tags blank when the listing has no value", () => {
    const rows = buildResolvedRowsForListing(
      { id: "listing-without-note", title: "Unnoted" },
      createRowsFromTagTextTemplate("{{privateNote}}"),
    );

    expect(rows).toEqual([]);
  });

  it("omits labeled cells and surrounding spacers when their fields are missing", () => {
    const rows = buildResolvedRowsForListing(
      {
        id: "listing-without-traits",
        title: "Unlinked Seedling",
      },
      createRowsFromTagTextTemplate(
        "# {{title}}\n\nBloom {{bloomSize}} | Scape {{scapeHeight}}",
      ),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells[0]?.text).toBe("Unlinked Seedling");
  });

  it("builds AI instructions with the syntax and all available fields", () => {
    const instructions = buildTagTemplateAiInstructions(
      "{{title}}\n{{hybridizerYear}}",
      {
        widthInches: 3.5,
        heightInches: 1,
        showQrCode: true,
      },
    );

    expect(instructions).toContain("Each line becomes one printed line");
    expect(instructions).toContain('Tag size: 3.50" × 1.00"');
    expect(instructions).toContain(
      "QR code: on; it always occupies the right side",
    );
    expect(instructions).toContain("no more than 3 nonblank rows");
    expect(instructions).toContain("no more than two columns per row");
    expect(instructions).toContain("no code fence");
    expect(instructions).toContain("# for large bold");
    expect(instructions).toContain("| to space columns apart");
    expect(instructions).toContain("{{hybridizerYear}}: Hybridizer, Year");
    expect(instructions).toContain("{{privateNote}}: Private Note");
    expect(findUnknownTagTemplateFields("{{title}} {{mystery}}")).toEqual([
      "mystery",
    ]);
    expect(
      getTagTextTemplateFieldIds(
        "{{title}}\n{{hybridizerYear}} · {{title}} · {{price}}",
      ),
    ).toEqual(["title", "hybridizerYear", "price"]);
  });

  it("rejects unsafe pasted template syntax", () => {
    expect(
      getTagTemplateValidationIssues(
        "```text\n{{title}} | {{year}} | {{price}}\n<div>{{title}}</div>\n{{oops",
      ),
    ).toEqual([
      "Paste plain template text without a Markdown code fence.",
      "Use no more than two columns per row.",
      "HTML is not supported.",
      "One or more field placeholders have incomplete braces.",
    ]);
  });

  it("warns when fitted text or row count will not be comfortably readable", () => {
    const warnings = getTagPreviewWarnings({
      tags: [
        {
          id: "tag-1",
          qrCodeUrl: "https://example.com/listing",
          rows: buildResolvedRowsForListing(
            {
              id: "long-listing",
              title:
                "An Extremely Long Cultivar Name That Cannot Stay Comfortably Legible",
            },
            createRowsFromTagTextTemplate(
              "# {{title}}\n## Details\n## Details\n## Details",
            ),
          ),
        },
      ],
      widthInches: 3.5,
      heightInches: 0.75,
    });

    expect(warnings).toEqual([
      "Some text shrinks below 10px. Use a wider tag or fewer fields.",
      "This layout may be too tall for the selected tag size.",
    ]);
  });

  it("builds QR codes with a four-module quiet zone", () => {
    expect(buildQrCodeSvgMarkup("https://example.com")).toContain(
      'viewBox="0 0 33 33"',
    );
  });

  it("offers four job-based presets with safe template text", () => {
    expect(
      BUILTIN_TAG_LAYOUT_TEMPLATES.map((template) => template.name),
    ).toEqual(["Simple name", "Garden ID", "Sale tag", "Grower details"]);
    expect(
      BUILTIN_TAG_LAYOUT_TEMPLATES.map((template) =>
        tagDesignerStateToTemplateText(template.layout),
      ),
    ).toEqual([
      "# {{title}}",
      "# {{title}}\n{{hybridizerYear}}\n- {{ploidy}}",
      "# {{title}}\n{{hybridizerYear}}\n## {{ploidy}} | {{price}}",
      "# {{title}}\n## {{hybridizerYear}}\n{{ploidy}} | {{foliageType}}\nBloom {{bloomSize}} | Scape {{scapeHeight}}\n- Season {{bloomSeason}} | Habit {{bloomHabit}}",
    ]);
  });

  it("matches templates by content independently of size and QR settings", () => {
    const base = BUILTIN_TAG_LAYOUT_TEMPLATES[1]!.layout;

    expect(
      createLayoutSignature({
        ...base,
        sizePresetId: "card-2x3.5",
        customWidthInches: 5,
        customHeightInches: 3,
        showQrCode: false,
      }),
    ).toBe(createLayoutSignature(base));
  });
});
