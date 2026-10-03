import * as React from "react";
import { TRPCClientError } from "@trpc/client";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRouter } from "@/server/api/root";
import {
  ContentManagerFormItem,
  type ContentManagerFormHandle,
} from "@/components/forms/content-form";

const mutateAsyncMock = vi.hoisted(() => vi.fn());
const editorMountMock = vi.hoisted(() => vi.fn());
const getProfileMock = vi.hoisted(() => vi.fn());
const setProfileDataMock = vi.hoisted(() => vi.fn());

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
              data: { text: "Updated content" },
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
});
