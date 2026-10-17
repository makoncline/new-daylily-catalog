type Id = string;

export type MinimalCollection<R extends { id: string }> = {
  get: (id: Id) => { id: Id } | undefined;
  utils: {
    writeInsert: (data: R | R[]) => Promise<void>;
    writeDelete: (keyOrPredicate: Id | Id[]) => Promise<void>;
    writeBatch: (fn: () => void) => Promise<void>;
  };
};

/**
 * Pattern:
 * 1) optimistic temp via writeInsert
 * 2) await server create
 * 3) atomic swap (delete temp -> insert created)
 * 4) rollback temp on error
 */
export function makeInsertWithSwap<D, R extends { id: string }>(args: {
  collection: MinimalCollection<R>;
  makeTemp: (draft: D) => R;
  serverInsert: (draft: D) => Promise<R>;
}) {
  const { collection, makeTemp, serverInsert } = args;

  return async (draft: D) => {
    const temp = makeTemp(draft);
    await collection.utils.writeInsert(temp);

    try {
      const created = await serverInsert(draft);

      const tempStillPresent = !!collection.get(temp.id);
      const realAlreadyPresent = !!collection.get(created.id);

      await collection.utils.writeBatch(() => {
        if (tempStillPresent) void collection.utils.writeDelete(temp.id);
        if (!realAlreadyPresent) void collection.utils.writeInsert(created);
      });

      return created;
    } catch (error) {
      try {
        await collection.utils.writeDelete(temp.id);
      } catch {
        // ignore rollback errors
      }
      throw error;
    }
  };
}
