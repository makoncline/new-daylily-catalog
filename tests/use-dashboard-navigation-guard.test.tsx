import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DashboardNavigationGuardProvider,
  type PendingChangesGuardHandle,
} from "@/hooks/use-dashboard-navigation-guard";
import { usePendingChangesGuard } from "@/hooks/use-pending-changes-guard";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
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

function GuardHarness({
  handle,
}: {
  handle: PendingChangesGuardHandle<"navigate">;
}) {
  const formRef = React.useRef<PendingChangesGuardHandle<"navigate"> | null>(
    handle,
  );
  formRef.current = handle;
  usePendingChangesGuard(formRef, "navigate", true);

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

describe("DashboardNavigationGuardProvider", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    window.history.pushState({}, "", "/dashboard/profile");
  });

  it("queues the latest navigation while save is in-flight", async () => {
    let hasPending = true;
    const saveDeferred = createDeferred<boolean>();

    const handle: PendingChangesGuardHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => hasPending),
      saveChanges: vi.fn(async () => {
        const didSave = await saveDeferred.promise;
        hasPending = !didSave;
        return didSave;
      }),
    };

    render(
      <DashboardNavigationGuardProvider>
        <GuardHarness handle={handle} />
      </DashboardNavigationGuardProvider>,
    );

    fireEvent.click(screen.getByTestId("nav-listings"));
    fireEvent.click(screen.getByTestId("nav-lists"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(handle.saveChanges).toHaveBeenCalledTimes(1);

    saveDeferred.resolve(true);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/lists");
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("blocks navigation when save fails", async () => {
    const handle: PendingChangesGuardHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => false),
    };

    render(
      <DashboardNavigationGuardProvider>
        <GuardHarness handle={handle} />
      </DashboardNavigationGuardProvider>,
    );

    fireEvent.click(screen.getByTestId("nav-listings"));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores hash-only anchors without saving", () => {
    const handle: PendingChangesGuardHandle<"navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    render(
      <DashboardNavigationGuardProvider>
        <GuardHarness handle={handle} />
      </DashboardNavigationGuardProvider>,
    );

    fireEvent.click(screen.getByTestId("nav-hash"));

    expect(handle.saveChanges).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
