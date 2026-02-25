import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSaveBeforeNavigate,
  type SaveOnNavigateHandle,
} from "@/hooks/use-save-before-navigate";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

function SaveBeforeNavigateHarness({
  handle,
}: {
  handle: SaveOnNavigateHandle<"navigate">;
}) {
  const formRef = React.useRef<SaveOnNavigateHandle<"navigate"> | null>(handle);
  useSaveBeforeNavigate(formRef, "navigate", true);

  return (
    <div>
      <a href="/dashboard/listings" data-testid="nav-listings">
        Listings
      </a>
      <a href="#section" data-testid="nav-hash">
        Section
      </a>
    </div>
  );
}

describe("useSaveBeforeNavigate", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    window.history.pushState({}, "", "/dashboard/profile");
  });

  it("saves before internal navigation when changes are pending", async () => {
    let hasPending = true;

    const handle: SaveOnNavigateHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => hasPending),
      saveChanges: vi.fn(async () => {
        hasPending = false;
        return true;
      }),
    };

    render(<SaveBeforeNavigateHarness handle={handle} />);

    fireEvent.click(screen.getByTestId("nav-listings"));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).toHaveBeenCalledWith("/dashboard/listings");
  });

  it("blocks navigation when save fails", async () => {
    const handle: SaveOnNavigateHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => false),
    };

    render(<SaveBeforeNavigateHarness handle={handle} />);

    fireEvent.click(screen.getByTestId("nav-listings"));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("prompts beforeunload when changes are pending", () => {
    const handle: SaveOnNavigateHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    render(<SaveBeforeNavigateHarness handle={handle} />);

    const beforeUnloadEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
  });

  it("ignores hash-only anchors", () => {
    const handle: SaveOnNavigateHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    render(<SaveBeforeNavigateHarness handle={handle} />);

    fireEvent.click(screen.getByTestId("nav-hash"));

    expect(handle.saveChanges).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
