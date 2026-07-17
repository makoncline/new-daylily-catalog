import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlugChangeConfirmDialog } from "@/components/slug-change-confirm-dialog";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SlugChangeConfirmDialog", () => {
  it("describes the URL warning without invalid HTML or accessibility warnings", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <SlugChangeConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        currentSlug="rolling-oaks"
        baseUrl="https://daylilycatalog.com"
      />,
    );

    const dialog = screen.getByRole("alertdialog", {
      name: "Before You Edit Your URL",
    });
    expect
      .soft(dialog)
      .toHaveAccessibleDescription(
        /Changing your profile URL can break existing links/,
      );
    expect(dialog).toHaveTextContent(
      "Current URL: daylilycatalog.com/rolling-oaks",
    );

    const diagnostics = [...consoleError.mock.calls, ...consoleWarn.mock.calls]
      .flat()
      .join("\n");
    expect.soft(diagnostics).not.toContain("cannot be a descendant of");
    expect.soft(diagnostics).not.toContain("cannot contain a nested");
    expect
      .soft(diagnostics)
      .not.toContain("Missing `Description` or `aria-describedby={undefined}`");
  });
});
