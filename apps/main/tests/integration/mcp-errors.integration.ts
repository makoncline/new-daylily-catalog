import { readFileSync } from "node:fs";
import path from "node:path";
import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

test("MCP hides database failures and preserves actionable errors and recovery", async ({
  request,
}) => {
  const call = async (name: string, args: Record<string, unknown>) => {
    const response = await request.post("/api/mcp/server", {
      headers: { authorization: "Bearer integration-oauth-seller" },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      },
    });
    expect(response.status()).toBe(200);
    return (await response.json()).result;
  };

  await withTempE2EDb(
    async (db) => {
      const list = await db.list.create({
        data: {
          id: "mcp-error-list",
          userId: "integration-user",
          title: "Before",
        },
      });
      const input = {
        listId: list.id,
        expectedUpdatedAt: list.updatedAt.toISOString(),
        title: "After",
      };
      try {
        await db.$executeRawUnsafe(`CREATE TRIGGER mcp_write_failure
        BEFORE UPDATE ON "List" WHEN OLD.id = 'mcp-error-list'
        BEGIN SELECT RAISE(ABORT, 'private-database-failure-marker'); END`);
        try {
          expect(await call("daylily.update_list", input)).toEqual({
            isError: true,
            content: [
              {
                type: "text",
                text: "INTERNAL_ERROR: The tool could not complete the request.",
              },
            ],
            structuredContent: {
              error: {
                code: "INTERNAL_ERROR",
                message: "The tool could not complete the request.",
              },
            },
          });
          expect(
            await db.list.findUniqueOrThrow({ where: { id: list.id } }),
          ).toMatchObject({ title: "Before" });
          const logPath = process.env.INTEGRATION_EVIDENCE_DIR
            ? path.join(
                process.env.INTEGRATION_EVIDENCE_DIR,
                "private/server.log",
              )
            : "tests/.tmp/integration-server.log";
          await expect
            .poll(() => readFileSync(logPath, "utf8"))
            .toContain("Unexpected MCP error:");
        } finally {
          await db.$executeRawUnsafe("DROP TRIGGER mcp_write_failure");
        }

        expect(await call("daylily.update_list", input)).toMatchObject({
          structuredContent: { list: { id: list.id, title: "After" } },
        });
        expect(
          await db.list.findUniqueOrThrow({ where: { id: list.id } }),
        ).toMatchObject({ title: "After" });
        expect(await call("daylily.update_list", input)).toMatchObject({
          isError: true,
          structuredContent: {
            error: {
              code: "CONFLICT",
              message:
                "The list changed. Load the latest version before saving.",
            },
          },
        });
        expect(
          await call("daylily.update_list", { ...input, listId: "missing" }),
        ).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: "NOT_FOUND", message: "List not found" },
          },
        });
        expect(
          await call("daylily.list_listings", { cursor: "invalid" }),
        ).toMatchObject({
          isError: true,
          structuredContent: {
            error: {
              code: "INVALID_ARGUMENTS",
              message: "Invalid listing page cursor.",
            },
          },
        });
      } finally {
        await db.list.delete({ where: { id: list.id } });
      }
    },
    { clearFirst: false },
  );
});
