"use client";

import { useCallback, useRef, useState } from "react";

export function useParentCommitFlag() {
  const needsParentCommitRef = useRef(false);
  const [, setNeedsParentCommit] = useState(false);

  const markNeedsParentCommit = useCallback(() => {
    if (needsParentCommitRef.current) {
      return;
    }

    needsParentCommitRef.current = true;
    setNeedsParentCommit(true);
  }, []);

  const resetNeedsParentCommit = useCallback(() => {
    needsParentCommitRef.current = false;
    setNeedsParentCommit(false);
  }, []);

  return {
    markNeedsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  };
}
