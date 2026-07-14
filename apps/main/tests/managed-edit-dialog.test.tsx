import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManagedEditDialog } from "@/app/dashboard/_components/managed-edit-dialog";
import { ListingsNextUrlEffects } from "@/app/dashboard/listings-next/listings-next-url-effects";
import type { SaveOnNavigateHandle } from "@/hooks/use-save-before-navigate";

const navigationMocks = vi.hoisted(() => ({
  saveIfDirty: vi.fn(async () => true),
}));

vi.mock("@/hooks/use-save-before-navigate", () => ({
  useSaveBeforeNavigate: vi.fn(() => ({
    attemptNavigate: vi.fn(),
    saveIfDirty: navigationMocks.saveIfDirty,
  })),
}));

describe("ManagedEditDialog", () => {
  beforeEach(() => {
    navigationMocks.saveIfDirty.mockClear();
  });

  it("saves before closing and then closes when save succeeds", async () => {
    const onClose = vi.fn();
    const handle: SaveOnNavigateHandle<"close" | "navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    render(
      <ManagedEditDialog
        description="Edit description"
        entityId="item-1"
        fallback={<div>Loading</div>}
        isOpen
        onClose={onClose}
        renderForm={(id, formRef) => {
          formRef.current = handle;
          return <div>Editing {id}</div>;
        }}
        title="Edit Item"
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledWith("close");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks closing when save fails", async () => {
    const onClose = vi.fn();
    const handle: SaveOnNavigateHandle<"close" | "navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => false),
    };

    render(
      <ManagedEditDialog
        description="Edit description"
        entityId="item-1"
        fallback={<div>Loading</div>}
        isOpen
        onClose={onClose}
        renderForm={(id, formRef) => {
          formRef.current = handle;
          return <div>Editing {id}</div>;
        }}
        title="Edit Item"
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(handle.saveChanges).toHaveBeenCalledWith("close");
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes a deleted entity without trying to save it afterward", async () => {
    const handle: SaveOnNavigateHandle<"close" | "navigate"> = {
      hasPendingChanges: vi.fn(() => true),
      saveChanges: vi.fn(async () => true),
    };

    function DeleteHarness() {
      const [entityId, setEntityId] = useState<string | null>("item-1");
      return (
        <ManagedEditDialog
          description="Edit description"
          entityId={entityId}
          fallback={<div>Loading</div>}
          guardEntityTransitions
          isOpen={Boolean(entityId)}
          onClose={() => setEntityId(null)}
          onEntityChangeRejected={setEntityId}
          renderForm={(id, formRef, onDeleted) => {
            formRef.current = handle;
            return <button onClick={onDeleted}>Delete {id}</button>;
          }}
          title="Edit Item"
        />
      );
    }

    render(<DeleteHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Delete item-1" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(navigationMocks.saveIfDirty).not.toHaveBeenCalled();
    expect(handle.saveChanges).not.toHaveBeenCalled();
  });

  it("targets the requested entity when an image-section URL arrives during a save", async () => {
    let finishSave: ((didSave: boolean) => void) | undefined;
    navigationMocks.saveIfDirty.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishSave = resolve;
        }),
    );
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    function TransitionHarness() {
      const [entityId, setEntityId] = useState("item-1");
      const [showImages, setShowImages] = useState(false);
      return (
        <>
          <button
            onClick={() => {
              setEntityId("item-2");
              setShowImages(true);
            }}
          >
            Open images
          </button>
          <ManagedEditDialog
            description="Edit description"
            entityId={entityId}
            fallback={<div>Loading</div>}
            guardEntityTransitions
            isOpen
            onClose={() => undefined}
            onEntityChangeRejected={setEntityId}
            renderForm={(id) => (
              <div>
                Editing {id}
                <div data-listing-editor-section="images">Images for {id}</div>
              </div>
            )}
            title="Edit Item"
          />
          <ListingsNextUrlEffects
            editingId={entityId}
            showImages={showImages}
          />
        </>
      );
    }

    render(<TransitionHarness />);
    fireEvent.click(screen.getByText("Open images"));

    expect(scrollIntoView).not.toHaveBeenCalled();
    finishSave?.(true);

    await waitFor(() => {
      expect(screen.getByText("Editing item-2")).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });
    expect(scrollIntoView.mock.instances[0]).toHaveTextContent(
      "Images for item-2",
    );
  });
});
