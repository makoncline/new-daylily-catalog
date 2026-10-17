"use client";

import {
  Activity,
  useLayoutEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { EditorHistoryContext } from "@/hooks/editor-history-context";
import { Button } from "@/components/ui/button";
import { CreateListSurface } from "../lists/_components/create-list-dialog";
import { EditListSurface } from "../lists/_components/edit-list-dialog";
import {
  useCreateList,
  useEditList,
} from "../lists/_hooks/use-list-surface-state";
import {
  CreateListingSurface,
  useCreateListing,
} from "../listings/_components/create-listing-dialog";
import {
  EditListingSurface,
  useEditListing,
} from "../listings/_components/edit-listing-dialog";

import { useDashboardDb } from "./dashboard-db-provider";
import { useEditorHistory } from "../_hooks/use-editor-history";

type Editor =
  | { kind: "create-list" | "create-listing" }
  | { kind: "edit-list" | "edit-listing"; id: string };

export function DashboardEditorHost({
  children,
  holdWorkspace,
}: {
  children: React.ReactNode;
  holdWorkspace: (held: boolean) => void;
}) {
  const { userId } = useDashboardDb();
  const { userId: clerkUserId } = useAuth();
  return (
    <EditorHost key={`${clerkUserId}:${userId}`} holdWorkspace={holdWorkspace}>
      {children}
    </EditorHost>
  );
}

function EditorHost({
  children,
  holdWorkspace,
}: {
  children: React.ReactNode;
  holdWorkspace: (held: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canCreateList, closeCreateList, finishCreateList } = useCreateList();
  const { closeEditList } = useEditList();
  const { closeCreateListing, finishCreateListing } = useCreateListing();
  const { closeEditListing } = useEditListing();
  const creating = searchParams.get("creating") === "true";
  const editing = searchParams.get("editing");
  let requested: Editor | null = null;
  if (pathname === "/dashboard/lists") {
    if (creating && canCreateList) requested = { kind: "create-list" };
    else if (editing) requested = { kind: "edit-list", id: editing };
  } else if (pathname === "/dashboard/listings") {
    if (creating) requested = { kind: "create-listing" };
    else if (editing) requested = { kind: "edit-listing", id: editing };
  }
  const [retained, setRetained] = useState<Editor | null>(null);
  const [epoch, setEpoch] = useState(0);
  const overview = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const draftFocus = useRef<HTMLElement | null>(null);
  const draftScroll = useRef(0);
  const scrollY = useRef(0);
  const wasActive = useRef(false);
  const restoreDraftFocus = useRef(false);
  const history = useEditorHistory({
    holdWorkspace,
    onStart: () => {
      setRetained(requested);
      draftFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      draftScroll.current = window.scrollY;
    },
    onStay: () => {
      restoreDraftFocus.current = true;
    },
    onDiscard: () => {
      setEpoch((value) => value + 1);
    },
  });

  const editor = history.pending ? retained : requested;
  const active = editor !== null;
  const editorKey = editor
    ? `${editor.kind}:${"id" in editor ? editor.id : ""}:${epoch}`
    : "";

  useLayoutEffect(() => {
    if (restoreDraftFocus.current && !history.pending) {
      restoreDraftFocus.current = false;
      draftFocus.current?.focus({ preventScroll: true });
      window.scrollTo({ top: draftScroll.current });
    }
  }, [history.pending]);

  useLayoutEffect(() => {
    if (active) {
      wasActive.current = true;
      window.scrollTo({ top: 0 });
    } else if (wasActive.current) {
      wasActive.current = false;
      const frame = requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY.current });
        (returnFocus.current?.isConnected
          ? returnFocus.current
          : overview.current
        )?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [active]);

  const rememberOverview = (event: SyntheticEvent) => {
    scrollY.current = window.scrollY;
    if (event.target instanceof Element) {
      const button = event.target.closest("button");
      if (button) returnFocus.current = button;
    }
  };

  return (
    <>
      <Activity mode={active ? "hidden" : "visible"}>
        <div
          ref={overview}
          tabIndex={-1}
          onFocusCapture={rememberOverview}
          onPointerDownCapture={rememberOverview}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter" || event.key === " ")
              rememberOverview(event);
          }}
        >
          {children}
        </div>
      </Activity>
      {active ? (
        <>
          {history.error ? (
            <div role="alert" data-history-recovery>
              <p>{history.error}</p>
              <Button onClick={history.retry}>Retry return</Button>
              <Button onClick={history.discard}>Discard draft here</Button>
            </div>
          ) : null}
          <div inert={history.pending}>
            <EditorHistoryContext value={history.registration}>
              {editor?.kind === "create-list" ? (
                <CreateListSurface
                  key={editorKey}
                  onClose={closeCreateList}
                  onCreated={finishCreateList}
                />
              ) : editor?.kind === "edit-list" ? (
                <EditListSurface
                  key={editorKey}
                  listId={editor.id}
                  onClose={closeEditList}
                />
              ) : editor?.kind === "create-listing" ? (
                <CreateListingSurface
                  key={editorKey}
                  onClose={closeCreateListing}
                  onCreated={finishCreateListing}
                />
              ) : editor?.kind === "edit-listing" ? (
                <EditListingSurface
                  key={editorKey}
                  listingId={editor.id}
                  onClose={closeEditListing}
                />
              ) : null}
            </EditorHistoryContext>
          </div>
        </>
      ) : null}
    </>
  );
}
