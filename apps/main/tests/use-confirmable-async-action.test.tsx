import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";

function createDeferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("useConfirmableAsyncAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes the dialog after a successful action", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useConfirmableAsyncAction({
        action,
        onSuccess,
      }),
    );

    act(() => {
      result.current.openDialog();
    });

    expect(result.current.isDialogOpen).toBe(true);

    await act(async () => {
      await result.current.runAction();
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it("keeps the dialog open after a failed action", async () => {
    const error = new Error("delete failed");
    const action = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useConfirmableAsyncAction({
        action,
        onError,
      }),
    );

    act(() => {
      result.current.openDialog();
    });

    await act(async () => {
      await result.current.runAction();
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it("ignores duplicate confirms while the action is pending", async () => {
    const deferred = createDeferredPromise();
    const action = vi.fn().mockReturnValue(deferred.promise);

    const { result } = renderHook(() =>
      useConfirmableAsyncAction({
        action,
      }),
    );

    act(() => {
      result.current.openDialog();
    });

    let firstRun: Promise<boolean> | undefined;
    let secondRun: Promise<boolean> | undefined;
    act(() => {
      firstRun = result.current.runAction();
      secondRun = result.current.runAction();
    });

    expect(action).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      deferred.resolve();
      await Promise.all([firstRun, secondRun]);
    });

    expect(await secondRun).toBe(false);
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.isPending).toBe(false);
  });
});
