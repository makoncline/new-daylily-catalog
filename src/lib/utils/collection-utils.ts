type Id = string;

export type MinimalCollection<R extends { id: string }> = {
  get: (id: Id) => { id: Id } | undefined;
  utils: {
    writeInsert: (data: R | R[]) => void;
    writeDelete: (keyOrPredicate: Id | Id[]) => void;
    writeBatch: (fn: () => void) => void;
  };
};

/**
 * Pattern:
 * 1) optimistic temp via writeInsert
 * 2) await server create
 * 3) atomic swap (delete temp → insert created)
 * 4) rollback temp on error
 */
export function makeInsertWithSwap<D, R extends { id: string }>(args: {
  collection: MinimalCollection<R>;
  makeTemp: (draft: D) => R;
  serverInsert: (draft: D) => Promise<R>;
  onError?: (error: unknown, temp: R, draft: D) => void;
}) {
  const { collection, makeTemp, serverInsert, onError } = args;

  return async (draft: D) => {
    const temp = makeTemp(draft);

    // 1) optimistic temp
    collection.utils.writeInsert(temp);

    try {
      // 2) server create
      const created = await serverInsert(draft);

      // 3) atomic swap; tolerate if sync already merged 'created'
      const tempStillPresent = !!collection.get(temp.id);
      const realAlreadyPresent = !!collection.get(created.id);

      collection.utils.writeBatch(() => {
        if (tempStillPresent) collection.utils.writeDelete(temp.id);
        if (!realAlreadyPresent) collection.utils.writeInsert(created);
      });

      return created;
    } catch (err) {
      // 4) rollback temp + surface error
      try {
        collection.utils.writeDelete(temp.id);
      } catch {}
      onError?.(err, temp, draft);
      throw err;
    }
  };
}
