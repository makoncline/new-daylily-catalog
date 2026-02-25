import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContentManagerFormItem,
  type ContentManagerFormHandle,
} from "@/components/forms/content-form";

const mutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock("@/trpc/react", () => ({
  api: {
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
    mutateAsyncMock.mockResolvedValue(undefined);
  });

  it("calls onMutationSuccess after a successful save", async () => {
    const formRef = React.createRef<ContentManagerFormHandle>();
    const onMutationSuccess = vi.fn();

    render(
      <ContentManagerFormItem
        initialProfile={{ content: null } as never}
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
    expect(onMutationSuccess).toHaveBeenCalledTimes(1);
  });
});
