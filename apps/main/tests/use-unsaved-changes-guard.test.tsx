import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

function GuardHarness() {
  useUnsavedChangesGuard(() => true);

  return <a href="/dashboard/lists">Lists</a>;
}

describe("useUnsavedChangesGuard", () => {
  let navigation: EventTarget;
  beforeEach(() => {
    navigation = new EventTarget();
    vi.stubGlobal("navigation", navigation);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("cancels traversal before the router removes the editor", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<GuardHarness />);

    const traversal = new Event("navigate", { cancelable: true });
    Object.defineProperty(traversal, "navigationType", { value: "traverse" });
    navigation.dispatchEvent(traversal);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(traversal.defaultPrevented).toBe(true);
  });
});
