"use client";

import { useCallback, useRef, useState } from "react";

export function useParentCommitFlag() {
  const parentCommitVersionRef = useRef(0);
  const needsParentCommitRef = useRef(false);
  const [needsParentCommit, setNeedsParentCommit] = useState(false);

  const markNeedsParentCommit = useCallback(() => {
    parentCommitVersionRef.current += 1;
    if (needsParentCommitRef.current) {
      return;
    }

    needsParentCommitRef.current = true;
    setNeedsParentCommit(true);
  }, []);

  const resetNeedsParentCommit = useCallback(
    (version = parentCommitVersionRef.current) => {
      if (version !== parentCommitVersionRef.current) return;
      needsParentCommitRef.current = false;
      setNeedsParentCommit(false);
    },
    [],
  );

  return {
    markNeedsParentCommit,
    parentCommitVersionRef,
    needsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  };
}
