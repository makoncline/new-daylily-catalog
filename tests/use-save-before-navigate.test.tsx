import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSaveBeforeNavigate,
  type SaveOnNavigateHandle,
} from "@/hooks/use-save-before-navigate";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

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
      <a href="/dashboard/lists" data-testid="nav-lists">
        Lists
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
    toastErrorMock.mockReset();
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
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
  });

  it("honors the latest click while save is in-flight", async () => {
    let hasPending = true;
    const saveDeferred = createDeferred<boolean>();

    const handle: SaveOnNavigateHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => hasPending),
      saveChanges: vi.fn(async () => {
        const didSave = await saveDeferred.promise;
        hasPending = !didSave;
        return didSave;
      }),
    };

    render(<SaveBeforeNavigateHarness handle={handle} />);

    fireEvent.click(screen.getByTestId("nav-listings"));
    fireEvent.click(screen.getByTestId("nav-lists"));

    expect(handle.saveChanges).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    saveDeferred.resolve(true);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
    expect(mockPush).toHaveBeenLastCalledWith("/dashboard/lists");
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
