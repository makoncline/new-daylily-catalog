import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

function GuardHarness() {
  useUnsavedChangesGuard(() => true);

  return <a href="/dashboard/lists">Lists</a>;
}

describe("useUnsavedChangesGuard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets the user stay on the editor instead of discarding changes", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<GuardHarness />);

    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    screen.getByRole("link", { name: "Lists" }).dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it("restores the editor when browser Back is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const forward = vi
      .spyOn(window.history, "forward")
      .mockImplementation(() => {});
    render(<GuardHarness />);

    fireEvent(window, new PopStateEvent("popstate"));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledTimes(1);
  });
});
