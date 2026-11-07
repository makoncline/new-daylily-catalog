"use client";

import { useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import { equalFormValues, rebaseFormValues } from "@/lib/rebase-form-values";

type Versioned = { updatedAt: Date | string };
const timestamp = (record: Versioned) => new Date(record.updatedAt).getTime();

export function useFormCommit<
  TRecord extends Versioned,
  TValues extends FieldValues,
>(
  form: UseFormReturn<TValues>,
  initial: TRecord,
  toValues: (record: TRecord) => TValues,
) {
  const committed = useRef(initial);
  const [hasRemoteChange, setHasRemoteChange] = useState(false);
  const parent = useParentCommitFlag();
  const {
    needsParentCommitRef,
    parentCommitVersionRef,
    resetNeedsParentCommit,
  } = parent;
  function hasFieldChanges() {
    return !equalFormValues(form.getValues(), toValues(committed.current));
  }
  function hasPendingChanges() {
    return hasFieldChanges() || needsParentCommitRef.current;
  }
  function reset(record: TRecord) {
    committed.current = record;
    form.reset(toValues(record), { keepIsValid: true });
    resetNeedsParentCommit();
    setHasRemoteChange(false);
  }
  function rebase(record: TRecord) {
    if (timestamp(record) < timestamp(committed.current)) return;
    const draft = form.getValues();
    const values = rebaseFormValues(
      draft,
      toValues(committed.current),
      toValues(record),
    );
    setHasRemoteChange(!values);
    if (!values) return;
    committed.current = record;
    if (!equalFormValues(draft, values))
      form.reset(values, { keepIsValid: true });
  }
  async function saveFields(
    latest: TRecord,
    save: (values: TValues, expectedUpdatedAt: string) => Promise<TRecord>,
  ) {
    if (!hasFieldChanges()) {
      reset(
        timestamp(latest) > timestamp(committed.current)
          ? latest
          : committed.current,
      );
      return true;
    }
    const values = form.getValues();
    const childVersion = parentCommitVersionRef.current;
    const saved = await save(
      values,
      new Date(committed.current.updatedAt).toISOString(),
    );
    if (timestamp(saved) >= timestamp(committed.current)) {
      committed.current = saved;
      setHasRemoteChange(false);
      form.reset(toValues(saved), {
        keepIsValid: true,
        keepValues: !equalFormValues(form.getValues(), values),
      });
    }
    resetNeedsParentCommit(childVersion);
    return !hasPendingChanges();
  }

  return {
    ...parent,
    committed,
    hasRemoteChange,
    setHasRemoteChange,
    hasFieldChanges,
    hasPendingChanges,
    reset,
    rebase,
    saveFields,
  };
}
