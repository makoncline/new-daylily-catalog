import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTagPrintDocumentHtml,
  createTagSheetDocumentHtml,
  TagDesignerPanel,
  type TagListingData,
} from "@/app/dashboard/tags/_components/tag-designer-panel";

const sampleListings: TagListingData[] = [
  {
    id: "listing-1",
    title: "Moonlit Smile",
    price: 18.5,
    privateNote: "Divisions from back bed",
    listName: "Spring Favorites",
    ahsListing: {
      hybridizer: "Smith",
      year: "2015",
      bloomSize: '6"',
      scapeHeight: '32"',
      bloomSeason: "M",
      ploidy: "Tetraploid",
    },
  },
];

const multipleListings: TagListingData[] = [
  ...sampleListings,
  {
    id: "listing-2",
    title: "Solar Echo",
    price: 22,
    privateNote: "Display bed",
    listName: "Garden Mix",
    ahsListing: {
      hybridizer: "Jones",
      year: "2018",
      bloomSize: '7"',
      scapeHeight: '34"',
      bloomSeason: "M-L",
    },
  },
];

function openSheetCreator() {
  fireEvent.click(screen.getByRole("button", { name: "Make sheet" }));
}

describe("TagDesignerPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps one primary print action with secondary output options", () => {
    const { rerender } = render(<TagDesignerPanel listings={[]} />);
    const disabledOutputButton = screen.getByRole("button", {
      name: "Output options",
    });
    expect(disabledOutputButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Make sheet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();

    rerender(<TagDesignerPanel listings={sampleListings} />);
    expect(
      screen.getByRole("button", { name: "Output options" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Make sheet" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it("shows tag sizes in a select and reveals custom size inputs", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const sizeSelect = screen.getByLabelText("Tag Size");
    expect(sizeSelect).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Brother TZe/i }),
    ).toBeInTheDocument();

    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    expect(screen.getByLabelText("Width (in)")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (in)")).toBeInTheDocument();
  });

  it("lets custom tag size inputs stay empty until blur", async () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const sizeSelect = screen.getByLabelText("Tag Size");
    fireEvent.change(sizeSelect, { target: { value: "custom" } });

    const widthInput = screen.getByLabelText("Width (in)");
    const heightInput = screen.getByLabelText("Height (in)");

    fireEvent.change(widthInput, { target: { value: "" } });
    fireEvent.change(heightInput, { target: { value: "" } });
    expect(widthInput).toHaveValue(null);
    expect(heightInput).toHaveValue(null);

    fireEvent.change(widthInput, { target: { value: "4.2" } });
    fireEvent.change(heightInput, { target: { value: "1.75" } });
    fireEvent.blur(widthInput);
    fireEvent.blur(heightInput);

    await waitFor(() => {
      expect(widthInput).toHaveValue(4.2);
      expect(heightInput).toHaveValue(1.75);
    });
  });

  it("shows sample preview when no listings selected", () => {
    render(<TagDesignerPanel listings={[]} />);
    expect(screen.getByText("Sample Cultivar Name")).toBeInTheDocument();
    expect(
      screen.getByText("Sample preview: select listings below"),
    ).toBeInTheDocument();
  });

  it("shows selected listing data in preview and persists layout", async () => {
    const { unmount } = render(<TagDesignerPanel listings={sampleListings} />);

    expect(screen.getByText("Moonlit Smile")).toBeInTheDocument();
    expect(screen.getByText("Moonlit Smile")).toHaveClass("w-full");
    expect(screen.getByText(/Smith/)).toBeInTheDocument();
    expect(screen.getByText(/2015/)).toBeInTheDocument();

    unmount();
    render(<TagDesignerPanel listings={sampleListings} />);

    await waitFor(() => {
      expect(screen.getByText("Moonlit Smile")).toBeInTheDocument();
    });
  });

  it("opens sheet creator dialog from Make Sheet with one-tag defaults", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    openSheetCreator();

    expect(
      screen.getByRole("heading", { name: "Sheet Creator" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rows")).toHaveValue(1);
    expect(screen.getByLabelText("Columns")).toHaveValue(1);
    expect(
      screen.queryByLabelText("Copies of each selected label"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print quantity" }));
    expect(screen.getByLabelText("Copies of each selected label")).toHaveValue(
      1,
    );
    expect(screen.getByLabelText("Page width (in)")).toHaveValue(3.5);
    expect(screen.getByLabelText("Page height (in)")).toHaveValue(1);
    expect(screen.getByLabelText("Print dashed borders")).not.toBeChecked();
    expect(
      screen.getByText("1 label selected, 1 copy of each, 1 total label."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sheet Preview" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText("Moonlit Smile"),
    ).toHaveClass("w-full");
    expect(screen.getByRole("button", { name: "Print Sheets" })).toBeEnabled();
  });

  it("resets copies per label to 1 each time the sheet dialog opens", async () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    openSheetCreator();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Print quantity" }),
    );
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "4" } });
    fireEvent.blur(copiesInput);
    expect(copiesInput).toHaveValue(4);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    openSheetCreator();
    const reopenedDialog = screen.getByRole("dialog");
    fireEvent.click(
      within(reopenedDialog).getByRole("button", { name: "Print quantity" }),
    );

    await waitFor(() => {
      expect(
        within(reopenedDialog).getByLabelText("Copies of each selected label"),
      ).toHaveValue(1);
    });
  });

  it("shows copy totals and groups the same label first in sheet preview", async () => {
    render(<TagDesignerPanel listings={multipleListings} />);

    openSheetCreator();
    const dialog = screen.getByRole("dialog");

    const columnsInput = within(dialog).getByLabelText("Columns");
    fireEvent.change(columnsInput, { target: { value: "2" } });
    fireEvent.blur(columnsInput);

    const pageWidthInput = within(dialog).getByLabelText("Page width (in)");
    fireEvent.change(pageWidthInput, { target: { value: "7" } });
    fireEvent.blur(pageWidthInput);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Print quantity" }),
    );
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "2" } });
    fireEvent.blur(copiesInput);

    await waitFor(() => {
      expect(
        within(dialog).getByText(
          "2 labels selected, 2 copies of each, 4 total labels.",
        ),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(within(dialog).getAllByText("Moonlit Smile")).toHaveLength(2);
      expect(within(dialog).queryByText("Solar Echo")).not.toBeInTheDocument();
    });
  });

  it("defers commit for all sheet number fields until blur", () => {
    render(<TagDesignerPanel listings={sampleListings} />);
    openSheetCreator();
    const dialog = screen.getByRole("dialog");

    const scenarios = [
      { label: "Page width (in)", next: "4.25", expected: 4.25 },
      { label: "Page height (in)", next: "2.50", expected: 2.5 },
      { label: "Rows", next: "2", expected: 2 },
      { label: "Columns", next: "2", expected: 2 },
      { label: "Page margin X (in)", next: "0.10", expected: 0.1 },
      { label: "Page margin Y (in)", next: "0.10", expected: 0.1 },
      { label: "Tag padding X (in)", next: "0.05", expected: 0.05 },
      { label: "Tag padding Y (in)", next: "0.05", expected: 0.05 },
    ];

    for (const scenario of scenarios) {
      const input = within(dialog).getByLabelText(scenario.label);
      fireEvent.change(input, { target: { value: "" } });
      expect(input).toHaveValue(null);
      fireEvent.change(input, { target: { value: scenario.next } });
      expect(input).toHaveValue(Number(scenario.next));
      fireEvent.blur(input);
      expect(input).toHaveValue(scenario.expected);
    }

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Print quantity" }),
    );
    const copiesInput = within(dialog).getByLabelText(
      "Copies of each selected label",
    );
    fireEvent.change(copiesInput, { target: { value: "" } });
    expect(copiesInput).toHaveValue(null);
    fireEvent.change(copiesInput, { target: { value: "3" } });
    fireEvent.blur(copiesInput);
    expect(copiesInput).toHaveValue(3);
  });

  it("defers numeric validation until blur and supports +/- buttons", () => {
    render(<TagDesignerPanel listings={sampleListings} />);
    openSheetCreator();

    const rowsInput = screen.getByLabelText("Rows");
    fireEvent.change(rowsInput, { target: { value: "" } });
    expect(
      screen.queryByText(/Enter a whole number between 1 and 20/i),
    ).not.toBeInTheDocument();

    fireEvent.blur(rowsInput);
    expect(
      screen.getByText(/Enter a whole number between 1 and 20/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase Rows" }));
    expect(screen.getByLabelText("Rows")).toHaveValue(2);
    expect(
      screen.queryByText(/Enter a whole number between 1 and 20/i),
    ).not.toBeInTheDocument();
  });

  it("keeps template content selected when size and QR settings change", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    const gardenId = screen.getByRole("button", { name: /Garden ID/i });
    expect(gardenId).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByLabelText("Tag Size"), {
      target: { value: "card-2x3.5" },
    });
    fireEvent.click(screen.getByLabelText("Include QR code"));

    expect(gardenId).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Custom template")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Grower details/i }));
    expect(screen.getByLabelText("Include QR code")).not.toBeChecked();
    expect(screen.getByLabelText("Tag Size")).toHaveValue("card-2x4");
  });

  it("uses presets by default and reveals a simple custom template editor", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    expect(
      screen.getByRole("button", { name: /Simple name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Garden ID/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Grower ID/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sale tag/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Grower details/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("Column width (fr units)")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Row" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    const editor = screen.getByLabelText("Custom template");
    fireEvent.change(editor, {
      target: {
        value: "{{title}}\n{{hybridizerYear}} · {{price}}",
      },
    });

    expect(screen.getByText("Smith, 2015 · $18.50")).toBeInTheDocument();
  });

  it("applies the two-line Garden ID template with an auto-sized title", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(screen.getByRole("button", { name: /Garden ID/i }));

    expect(screen.getByText("Smith, 2015 tet")).toBeInTheDocument();
    expect(
      Number.parseFloat(screen.getByText("Moonlit Smile").style.fontSize),
    ).toBeGreaterThan(22);
  });

  it("does not erase formatting syntax while the user is typing", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    const editor = screen.getByLabelText("Custom template");

    fireEvent.change(editor, { target: { value: "# " } });
    expect(editor).toHaveValue("# ");

    fireEvent.change(editor, { target: { value: "# {{title}}\n" } });
    expect(editor).toHaveValue("# {{title}}\n");
  });

  it("checks readability warnings for selected tags beyond the visible eight", () => {
    const listings = Array.from({ length: 9 }, (_, index) => ({
      ...sampleListings[0]!,
      id: `listing-${index + 1}`,
      title:
        index === 8
          ? "An exceptionally long cultivar name that must shrink far below the readable size"
          : `Cultivar ${index + 1}`,
    }));
    render(<TagDesignerPanel listings={listings} />);

    expect(screen.getByText("Showing first 8 of 9 tags")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Some text shrinks below 10px. Use a wider tag or fewer fields.",
      ),
    ).toBeInTheDocument();
  });

  it("gives AI complete custom-template instructions", () => {
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Get AI instructions" }),
    );

    const instructions = screen.getByLabelText("AI template instructions");
    expect((instructions as HTMLTextAreaElement).value).toContain(
      "{{hybridizerYear}}: Hybridizer, Year",
    );
    expect((instructions as HTMLTextAreaElement).value).toContain(
      "{{privateNote}}: Private Note",
    );
    expect((instructions as HTMLTextAreaElement).value).toContain(
      'Tag size: 3.50" × 1.00"',
    );
  });

  it("guards and persists custom templates in this browser", () => {
    const { unmount } = render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Propagation tag" },
    });
    fireEvent.change(screen.getByLabelText("Custom template"), {
      target: { value: "{{title}} | {{year}} | {{price}}" },
    });

    expect(
      screen.getByText("Use no more than two columns per row."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save as template" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Custom template"), {
      target: { value: "# {{title}}\n- {{privateNote}}" },
    });
    expect(
      screen.getByText("Private notes will be printed on the tag."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save as template" }));
    expect(
      screen.getByRole("button", { name: "Propagation tag" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom template")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Propagation tag" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Renamed propagation tag" },
    });
    fireEvent.change(screen.getByLabelText("Custom template"), {
      target: { value: "# {{title}}\n{{price}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      screen.queryByRole("button", { name: "Propagation tag" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Renamed propagation tag" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom template")).not.toBeInTheDocument();

    unmount();
    render(<TagDesignerPanel listings={sampleListings} />);
    expect(
      screen.getByRole("button", { name: "Renamed propagation tag" }),
    ).toBeInTheDocument();
  });

  it("discards an unsaved custom layout back to Garden ID", () => {
    const { unmount } = render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.change(screen.getByLabelText("Custom template"), {
      target: { value: "# {{title}}\n{{price}}" },
    });
    unmount();

    render(<TagDesignerPanel listings={sampleListings} />);
    expect(screen.getByLabelText("Custom template")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.queryByLabelText("Custom template")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Garden ID/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("can discard after deleting the template being customized", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TagDesignerPanel listings={sampleListings} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Temporary template" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save as template" }));
    fireEvent.click(screen.getByRole("button", { name: "Temporary template" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Customize this template" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete template Temporary template",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.queryByLabelText("Custom template")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Garden ID/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("createTagPrintDocumentHtml", () => {
  it("renders row cells with text-align in printable markup", () => {
    const html = createTagPrintDocumentHtml({
      widthInches: 3.5,
      heightInches: 1,
      tags: [
        {
          id: "tag-1",
          rows: [
            {
              id: "row-1",
              cells: [
                {
                  id: "cell-1",
                  text: "Title: Moonlit Smile",
                  width: 2,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
                {
                  id: "cell-2",
                  text: "Price: $18.50",
                  width: 1,
                  textAlign: "right",
                  fontSize: 10,
                  bold: false,
                  italic: true,
                  underline: true,
                },
              ],
            },
            {
              id: "spacer-1",
              cells: [],
              isSpacer: true,
            },
          ],
        },
      ],
    });

    expect(html).toContain("Title: Moonlit Smile");
    expect(html).toContain("Price: $18.50");
    expect(html).toContain("text-decoration: underline");
    expect(html).toContain("text-align: left");
    expect(html).toContain("text-align: right");
    expect(html).toContain("flex: 2 1 0");
    expect(html).toContain("flex: 1 1 0");
    expect(html).toContain('class="row spacer"');
    expect(html).toContain(".row > .cell:only-child");
  });

  it("keeps text on one line and places the QR in a fixed right column", () => {
    const html = createTagPrintDocumentHtml({
      widthInches: 3.5,
      heightInches: 1,
      tags: [
        {
          id: "tag-1",
          qrCodeUrl: "https://example.com/moonlit-smile",
          rows: [
            {
              id: "row-1",
              cells: [
                {
                  id: "cell-1",
                  text: "Moonlit Smile",
                  width: 1,
                  textAlign: "left",
                  fontSize: 22,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(html).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(html).toContain("justify-content: space-between");
    expect(html).toContain("white-space: nowrap");
    expect(html).not.toContain("padding-bottom: 0.6in");
  });

  it("renders sheet pages with configured rows and columns", () => {
    const html = createTagSheetDocumentHtml({
      tags: [
        {
          id: "tag-1",
          rows: [
            {
              id: "row-1",
              cells: [
                {
                  id: "cell-1",
                  text: "Moonlit Smile",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
        {
          id: "tag-2",
          rows: [
            {
              id: "row-2",
              cells: [
                {
                  id: "cell-2",
                  text: "Second Tag",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
        {
          id: "tag-3",
          rows: [
            {
              id: "row-3",
              cells: [
                {
                  id: "cell-3",
                  text: "Third Tag",
                  width: 1,
                  textAlign: "left",
                  fontSize: 12,
                  bold: true,
                  italic: false,
                  underline: false,
                },
              ],
            },
          ],
        },
      ],
      sheetState: {
        pageWidthInches: 7,
        pageHeightInches: 2,
        rows: 1,
        columns: 2,
        marginXInches: 0,
        marginYInches: 0,
        paddingXInches: 0,
        paddingYInches: 0,
        printDashedBorders: false,
      },
      tagWidthInches: 3.5,
      tagHeightInches: 1,
    });

    expect(html).not.toBeNull();
    expect(html).toContain("grid-template-columns: repeat(2, 3.5in)");
    expect(html).toContain("border: none");
    expect(html).toContain("Moonlit Smile");
    expect(html).toContain("Third Tag");
    expect(html?.match(/class=\"sheet-page\"/g)).toHaveLength(2);

    const htmlWithDashedBorders = createTagSheetDocumentHtml({
      tags: [],
      sheetState: {
        pageWidthInches: 3.5,
        pageHeightInches: 1,
        rows: 1,
        columns: 1,
        marginXInches: 0,
        marginYInches: 0,
        paddingXInches: 0,
        paddingYInches: 0,
        printDashedBorders: true,
      },
      tagWidthInches: 3.5,
      tagHeightInches: 1,
    });
    expect(htmlWithDashedBorders).toContain("border: 1px dashed #d4d4d8");
  });
});
