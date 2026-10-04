import * as React from "react";
import { TRPCClientError } from "@trpc/client";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRouter } from "@/server/api/root";
import { sanitizeEditorJsContentForStorage } from "@/server/security/editor-js-content";
import {
  ContentManagerFormItem,
  type ContentManagerFormHandle,
} from "@/components/forms/content-form";

const mutateAsyncMock = vi.hoisted(() => vi.fn());
const editorMountMock = vi.hoisted(() => vi.fn());
const getProfileMock = vi.hoisted(() => vi.fn());
const setProfileDataMock = vi.hoisted(() => vi.fn());
const editorState = vi.hoisted(() => ({ text: "Updated content" }));

vi.mock("@/trpc/client", () => ({
  getTrpcClient: () => ({
    dashboardDb: { userProfile: { get: { query: getProfileMock } } },
  }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    useUtils: () => ({
      dashboardDb: { userProfile: { get: { setData: setProfileDataMock } } },
    }),
    dashboardDb: {
      userProfile: {
        updateContent: {
          useMutation: () => ({
            mutateAsync: mutateAsyncMock,
            isPending: false,
          }),
        },
      },
    },
  },
}));

vi.mock("@/components/editor", () => ({
  Editor: ({
    editorRef,
    onChange,
  }: {
    editorRef: React.MutableRefObject<{
      save: () => Promise<{
        time: number;
        version: string;
        blocks: Array<{
          id: string;
          type: string;
          data: { text: string };
        }>;
      }>;
    } | null>;
    onChange?: () => void;
  }) => {
    React.useEffect(() => {
      editorMountMock();
      editorRef.current = {
        save: async () => ({
          time: 1,
          version: "2.30.8",
          blocks: [
            {
              id: "block-1",
              type: "paragraph",
              data: { text: editorState.text },
            },
          ],
        }),
      };

      return () => {
        editorRef.current = null;
      };
    }, [editorRef]);

    return (
      <button
        type="button"
        data-testid="editor-change"
        onClick={() => onChange?.()}
      >
        Change content
      </button>
    );
  },
}));

vi.mock("usehooks-ts", () => ({
  useOnClickOutside: vi.fn(),
}));

describe("ContentManagerFormItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editorState.text = "Updated content";
    mutateAsyncMock.mockResolvedValue({
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    });
    getProfileMock.mockResolvedValue({
      content: JSON.stringify({
        blocks: [{ id: "remote", type: "paragraph", data: { text: "Remote" } }],
      }),
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    });
  });

  it("calls onMutationSuccess after a successful save", async () => {
    const formRef = React.createRef<ContentManagerFormHandle>();
    const onMutationSuccess = vi.fn();

    render(
      <ContentManagerFormItem
        initialProfile={
          {
            content: null,
            updatedAt: new Date("2026-09-25T12:00:00.000Z"),
          } as never
        }
        formRef={formRef}
        onMutationSuccess={onMutationSuccess}
      />,
    );

    fireEvent.click(screen.getByTestId("editor-change"));
    await waitFor(() =>
      expect(formRef.current?.hasPendingChanges()).toBe(true),
    );

    await act(async () => {
      const didSave = await formRef.current?.saveChanges("manual");
      expect(didSave).toBe(true);
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedUpdatedAt: "2026-09-25T12:00:00.000Z",
      }),
    );
    expect(onMutationSuccess).toHaveBeenCalledTimes(1);
  });

  it("keeps an unsaved story mounted when a newer profile arrives", async () => {
    const formRef = React.createRef<ContentManagerFormHandle>();
    const originalProfile = {
      content: null,
      updatedAt: new Date("2026-09-25T12:00:00.000Z"),
    } as never;
    const { rerender } = render(
      <ContentManagerFormItem
        initialProfile={originalProfile}
        formRef={formRef}
      />,
    );
    fireEvent.click(screen.getByTestId("editor-change"));

    await waitFor(() =>
      expect(formRef.current?.hasPendingChanges()).toBe(true),
    );

    rerender(
      <ContentManagerFormItem
        initialProfile={
          {
            content: JSON.stringify({
              blocks: [
                { id: "remote", type: "paragraph", data: { text: "Remote" } },
              ],
            }),
            updatedAt: new Date("2026-09-25T13:00:00.000Z"),
          } as never
        }
        formRef={formRef}
      />,
    );

    expect(editorMountMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your unsaved story is still here",
    );
    mutateAsyncMock.mockRejectedValueOnce(new Error("Conflict"));
    await act(async () => {
      expect(await formRef.current?.saveChanges("manual")).toBe(false);
    });
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedUpdatedAt: "2026-09-25T12:00:00.000Z",
      }),
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Discard this draft and load the latest story",
        }),
      );
    });
    expect(editorMountMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("loads a new profile after a stale story save and keeps the draft", async () => {
    const formRef = React.createRef<ContentManagerFormHandle>();
    render(
      <ContentManagerFormItem
        initialProfile={
          {
            content: null,
            updatedAt: new Date("2026-09-25T12:00:00.000Z"),
          } as never
        }
        formRef={formRef}
      />,
    );
    fireEvent.click(screen.getByTestId("editor-change"));
    await waitFor(() =>
      expect(formRef.current?.hasPendingChanges()).toBe(true),
    );
    mutateAsyncMock.mockRejectedValueOnce(
      TRPCClientError.from<AppRouter>({
        error: {
          code: -32009,
          message:
            "Profile changed. Read it again before replacing its content.",
          data: { code: "CONFLICT", httpStatus: 409, zodError: null },
        },
      }),
    );

    await act(async () => {
      expect(await formRef.current?.saveChanges("manual")).toBe(false);
    });

    expect(getProfileMock).toHaveBeenCalledOnce();
    expect(setProfileDataMock).toHaveBeenCalledOnce();
    expect(editorMountMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your unsaved story is still here",
    );
  });

  it("keeps new text typed while a story save is pending", async () => {
    let finishSave!: (profile: { updatedAt: Date }) => void;
    mutateAsyncMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    const formRef = React.createRef<ContentManagerFormHandle>();
    render(
      <ContentManagerFormItem
        initialProfile={
          {
            content: null,
            updatedAt: new Date("2026-09-25T12:00:00.000Z"),
          } as never
        }
        formRef={formRef}
      />,
    );
    const editor = screen.getByTestId("editor-change");
    fireEvent.input(editor);
    expect(formRef.current?.hasPendingChanges()).toBe(true);
    let result!: Promise<boolean>;
    act(() => {
      result = formRef.current!.saveChanges("manual");
    });
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
    editorState.text = "New text during save";
    fireEvent.input(editor);
    await act(async () => {
      finishSave({ updatedAt: new Date("2026-09-25T13:00:00.000Z") });
      expect(await result).toBe(false);
    });
    expect(formRef.current?.hasPendingChanges()).toBe(true);
    await act(async () => {
      expect(await formRef.current?.saveChanges("manual")).toBe(true);
    });
    expect(mutateAsyncMock.mock.lastCall?.[0]).toMatchObject({
      expectedUpdatedAt: "2026-09-25T13:00:00.000Z",
      content: expect.stringContaining("New text during save"),
    });
    expect(formRef.current?.hasPendingChanges()).toBe(false);
  });

  it("keeps a newer draft when the server normalizes the saved story", async () => {
    let finishSave!: (profile: {
      content: string | null;
      updatedAt: Date;
    }) => void;
    mutateAsyncMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    const formRef = React.createRef<ContentManagerFormHandle>();
    const view = render(
      <ContentManagerFormItem
        initialProfile={
          {
            content: null,
            updatedAt: new Date("2026-09-25T12:00:00.000Z"),
          } as never
        }
        formRef={formRef}
      />,
    );
    editorState.text = '<a href="https://example.com/garden">Our garden</a>';
    fireEvent.input(screen.getByTestId("editor-change"));
    let result!: Promise<boolean>;
    act(() => {
      result = formRef.current!.saveChanges("manual");
    });
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
    const saved = {
      content: sanitizeEditorJsContentForStorage(
        mutateAsyncMock.mock.calls[0]![0].content,
      ),
      updatedAt: new Date("2026-09-25T13:00:00.000Z"),
    };
    expect(saved.content).not.toBe(mutateAsyncMock.mock.calls[0]![0].content);
    editorState.text += " New text during save";
    fireEvent.input(screen.getByTestId("editor-change"));
    await act(async () => {
      finishSave(saved);
      expect(await result).toBe(false);
    });
    view.rerender(
      <ContentManagerFormItem
        initialProfile={saved as never}
        formRef={formRef}
      />,
    );
    expect(formRef.current?.hasPendingChanges()).toBe(true);
    expect(editorMountMock).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
