import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardEditorHost } from "@/app/dashboard/_components/dashboard-editor-host";

const route = vi.hoisted(() => ({
  pathname: "/dashboard/lists",
  search: new URLSearchParams(),
}));
const insertList = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => route.search,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "actor-1" }) }));
vi.mock("@/app/dashboard/_components/dashboard-db-provider", () => ({
  useDashboardDb: () => ({ userId: "seller-1" }),
}));
vi.mock("@/app/dashboard/lists/_hooks/use-list-surface-state", () => ({
  useEditList: () => ({ closeEditList: vi.fn() }),
  useCreateList: () => ({
    canCreateList: true,
    closeCreateList: vi.fn(),
    finishCreateList: vi.fn(),
  }),
}));
vi.mock("@/app/dashboard/lists/_components/edit-list-dialog", () => ({
  EditListSurface: () => null,
}));
vi.mock("@/app/dashboard/listings/_components/create-listing-dialog", () => ({
  useCreateListing: () => ({
    closeCreateListing: vi.fn(),
    finishCreateListing: vi.fn(),
  }),
  CreateListingSurface: () => null,
}));
vi.mock("@/app/dashboard/listings/_components/edit-listing-dialog", () => ({
  useEditListing: () => ({ closeEditListing: vi.fn() }),
  EditListingSurface: () => null,
}));
vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  insertList,
}));

describe("Lists-create history route acknowledgement", () => {
  let nativeReplace: History["replaceState"];
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    route.search = new URLSearchParams();
    nativeReplace = history.replaceState.bind(history);
    nativeReplace({ publicMarker: "opaque" }, "", "/dashboard/lists");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function openEditor(unknownPredecessor = false) {
    const holdWorkspace = vi.fn();
    const view = render(
      <DashboardEditorHost holdWorkspace={holdWorkspace}>
        <p>Lists overview</p>
      </DashboardEditorHost>,
    );
    if (unknownPredecessor) {
      // Remove only app metadata from an existing entry. Router data stays opaque.
      const state = { ...history.state };
      delete state.__daylilyDashboardEntry;
      nativeReplace(state, "", location.href);
    }
    act(() => {
      history.pushState(history.state, "", "/dashboard/lists?creating=true");
      route.search = new URLSearchParams("creating=true");
      view.rerender(
        <DashboardEditorHost holdWorkspace={holdWorkspace}>
          <p>Lists overview</p>
        </DashboardEditorHost>,
      );
    });
    const title = screen.getByLabelText("List Title (required)");
    fireEvent.change(title, { target: { value: "Keep this draft" } });
    title.focus();
    const source = history.state.__daylilyDashboardEntry;
    const length = history.length;
    const acknowledge = (creating: boolean) => {
      route.search = new URLSearchParams(creating ? "creating=true" : "");
      view.rerender(
        <DashboardEditorHost holdWorkspace={holdWorkspace}>
          <p>Lists overview</p>
        </DashboardEditorHost>,
      );
    };
    return { title, source, length, holdWorkspace, acknowledge };
  }

  const tick = async (milliseconds: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(milliseconds);
    });
  };

  it("times out the initial target route, then returns a usable draft", async () => {
    const draft = openEditor();
    const go = vi.spyOn(history, "go");
    act(() => history.back());
    await tick(1);
    // The browser has moved. The router still reports the source route.
    await tick(5000);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "browser did not return",
    );
    expect(draft.title).toHaveValue("Keep this draft");
    expect(go).not.toHaveBeenCalled();
    expect(history.length).toBe(draft.length);

    draft.acknowledge(false);
    fireEvent.click(screen.getByRole("button", { name: "Retry return" }));
    await tick(1);
    draft.acknowledge(true);
    await tick(32);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(history.state.__daylilyDashboardEntry).toEqual(draft.source);
    expect(history.length).toBe(draft.length);
    expect(draft.title).toHaveFocus();
    expect(draft.title.closest("[inert]")).toBeNull();
    fireEvent.change(draft.title, {
      target: { value: "Recovered target draft" },
    });
    expect(draft.title).toHaveValue("Recovered target draft");
    expect(insertList).not.toHaveBeenCalled();
  });

  it("times out manual resume and releases the draft after route acknowledgement", async () => {
    const draft = openEditor(true);
    const go = vi.spyOn(history, "go");
    act(() => history.back());
    await tick(1);
    expect(screen.getByRole("alert")).toHaveTextContent("not tracked");
    draft.acknowledge(false);
    act(() => history.forward());
    await tick(1);
    await tick(5000);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "browser did not return",
    );
    expect(draft.title).toHaveValue("Keep this draft");
    expect(go).not.toHaveBeenCalled();
    expect(history.length).toBe(draft.length);

    draft.acknowledge(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry return" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(history.state.__daylilyDashboardEntry).toEqual(draft.source);
    expect(history.length).toBe(draft.length);
    expect(draft.title).toHaveFocus();
    expect(draft.title.closest("[inert]")).toBeNull();
    fireEvent.change(draft.title, {
      target: { value: "Recovered resume draft" },
    });
    expect(draft.title).toHaveValue("Recovered resume draft");
    expect(go).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(insertList).not.toHaveBeenCalled();
  });
});
