import { db } from "../db";

export interface KVStore {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export const kvStore = {
  async set<T>(key: string, value: T): Promise<void> {
    await db.keyValue.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  },

  async get<T>(key: string): Promise<T | null> {
    const record = await db.keyValue.findUnique({
      where: { key },
    });
    return record ? (JSON.parse(record.value) as T) : null;
  },

  async delete(key: string): Promise<void> {
    await db.keyValue.delete({
      where: { key },
    });
  },
};
