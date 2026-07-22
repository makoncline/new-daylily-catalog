import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardImportStartOver } from "@/app/dashboard/imports/_components/dashboard-import-start-over";

describe("DashboardImportStartOver", () => {
  it("confirms that only the browser-local import will be discarded", () => {
    const onStartOver = vi.fn();
    render(<DashboardImportStartOver onStartOver={onStartOver} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "Discard this import?",
    });
    expect(dialog).toHaveTextContent(
      "Your original spreadsheet and existing listings are not changed.",
    );

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Discard import" }),
    );
    expect(onStartOver).toHaveBeenCalledOnce();
  });
});
