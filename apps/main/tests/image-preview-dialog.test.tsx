import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt = "",
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    unoptimized?: boolean;
  }) => React.createElement("img", { alt, ...props }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImagePreviewDialog", () => {
  it("opens a named, described gallery without Radix accessibility warnings", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ImagePreviewDialog
        images={[
          {
            id: "image-1",
            url: "https://media.example/image-1.jpg",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View 1 image" }));

    const dialog = screen.getByRole("dialog", { name: "Image preview" });
    expect(dialog).toHaveAccessibleDescription("Full-size preview of 1 image.");
    expect(screen.getByRole("img", { name: "Gallery image" })).toBeVisible();

    const errors = consoleError.mock.calls.flat().join("\n");
    expect(errors).not.toContain("DialogContent requires a `DialogTitle`");
    expect(errors).not.toContain(
      "Missing `Description` or `aria-describedby={undefined}`",
    );
  });
});
