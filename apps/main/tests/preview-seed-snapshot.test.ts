// @vitest-environment node
import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { copyPreviewSeed } from "../scripts/copy-preview-seed.mjs";

test("copies a consistent preview snapshot without changing the source", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "daylily-preview-copy-"));
  const sourcePath = path.join(dir, "source.sqlite");
  const output = path.join(dir, "out", "snapshot.sqlite");
  const db = new DatabaseSync(sourcePath);
  db.exec(`CREATE TABLE parent(id INTEGER PRIMARY KEY AUTOINCREMENT, note TEXT, data BLOB, doubled INTEGER GENERATED ALWAYS AS (id * 2) STORED);
    CREATE TABLE child(id INTEGER PRIMARY KEY, parentId INTEGER REFERENCES parent(id));
    CREATE INDEX child_parent ON child(parentId);
    CREATE VIEW parent_view AS SELECT id, note FROM parent;
    INSERT INTO parent(id,note,data) VALUES (1,'private note',X'0102');
    INSERT INTO parent(id,note,data) VALUES (9,'deleted',X'00');
    DELETE FROM parent WHERE id=9;
    INSERT INTO child VALUES (2,1);`);
  db.close();
  const source = createClient({ url: `file:${sourcePath}`, intMode: "bigint" });
  try {
    await copyPreviewSeed(source, output);
    const copied = new DatabaseSync(output);
    try {
      expect(
        copied
          .prepare("SELECT note, hex(data) AS data, doubled FROM parent")
          .get(),
      ).toEqual({ note: "private note", data: "0102", doubled: 2 });
      expect(
        copied
          .prepare("SELECT seq FROM sqlite_sequence WHERE name='parent'")
          .get()?.seq,
      ).toBe(9);
      expect(
        copied.prepare("SELECT count(*) AS count FROM parent_view").get()
          ?.count,
      ).toBe(1);
      expect(copied.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      copied.prepare("UPDATE parent SET note='local only'").run();
    } finally {
      copied.close();
    }
    expect(
      (await source.execute("SELECT note FROM parent WHERE id=1")).rows[0]
        ?.note,
    ).toBe("private note");
    expect(statSync(output).mode & 0o777).toBe(0o600);
    await expect(copyPreviewSeed(source, output)).rejects.toThrow(
      "refusing to overwrite",
    );
    expect(existsSync(output)).toBe(true);
  } finally {
    source.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("leaves no output if the source read fails", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "daylily-preview-failure-"));
  const output = path.join(dir, "snapshot.sqlite");
  let closed = false;
  const source = {
    async transaction(mode: string) {
      expect(mode).toBe("read");
      return {
        async execute() {
          throw new Error("source unavailable");
        },
        close() {
          closed = true;
        },
      };
    },
  };
  try {
    await expect(
      copyPreviewSeed(
        source as unknown as Parameters<typeof copyPreviewSeed>[0],
        output,
      ),
    ).rejects.toThrow("source unavailable");
    expect(closed).toBe(true);
    expect(existsSync(output)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
