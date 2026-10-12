import path from "node:path";
import { mkdir } from "node:fs/promises";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { jsonlStreamProducer } from "@trpc/server/unstable-core-do-not-import";
import SuperJSON from "superjson";
import { expect, test } from "./fixtures";

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});

test.afterAll(() => db.$disconnect());

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 768 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  for (const changedWording of [false, true]) {
    test(`${changedWording ? "structured" : "native"} editor conflicts recover on ${device}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      const [originalList, originalListing, originalProfile] =
        await Promise.all([
          db.list.findUniqueOrThrow({
            where: { id: "integration-favorites-list" },
          }),
          db.listing.findUniqueOrThrow({
            where: { id: "integration-existing-listing" },
          }),
          db.userProfile.findUniqueOrThrow({
            where: { id: "integration-profile" },
          }),
        ]);
      try {
        for (const family of ["list", "listing", "profile"] as const) {
          const id =
            family === "profile"
              ? "integration-profile"
              : family === "list"
                ? "integration-favorites-list"
                : "integration-existing-listing";
          const record = () =>
            family === "profile"
              ? db.userProfile.findUniqueOrThrow({ where: { id } })
              : family === "list"
                ? db.list.findUniqueOrThrow({ where: { id } })
                : db.listing.findUniqueOrThrow({ where: { id } });
          const setTitle = (title: string) =>
            family === "profile"
              ? db.userProfile.update({ where: { id }, data: { title } })
              : family === "list"
                ? db.list.update({ where: { id }, data: { title } })
                : db.listing.update({ where: { id }, data: { title } });
          await setTitle(`Initial ${family}`);
          const editorUrl =
            family === "profile"
              ? "/dashboard/profile"
              : `/dashboard/${family === "list" ? "lists" : "listings"}?editing=${id}`;
          await page.goto(editorUrl);
          const editor =
            family === "profile"
              ? page.getByRole("main")
              : page.getByRole("region", {
                  name: `Edit ${family}`,
                  exact: true,
                });
          const field = editor.getByLabel(
            family === "profile"
              ? "Garden Name"
              : family === "list"
                ? "Title"
                : "Name",
            { exact: true },
          );
          const save = editor.getByRole("button", {
            name: "Save Changes",
            exact: true,
          });
          const recovery = editor.getByRole("button", {
            name:
              family === "profile"
                ? "Discard unsaved profile fields and load the latest profile"
                : `Discard this draft and load the latest ${family}`,
            exact: true,
          });
          const request = `**/api/trpc/dashboardDb.${family === "profile" ? "userProfile" : family}.update?*`;
          await expect(field).toHaveValue(`Initial ${family}`);
          await field.fill(`Retained ${family} draft`);
          await setTitle(`Latest ${family}`);
          if (changedWording) {
            await page.route(request, async (route) => {
              const response = await route.fetch({
                headers: { ...route.request().headers(), "trpc-accept": "" },
              });
              const results: Array<{
                error: ReturnType<typeof SuperJSON.serialize>;
              }> = await response.json();
              const error = SuperJSON.deserialize<{
                message: string;
                data: { code: string };
              }>(results[0]!.error);
              expect(error.data.code).toBe("CONFLICT");
              error.message = "A newer saved version exists.";
              const stream = jsonlStreamProducer({
                maxDepth: Infinity,
                serialize: SuperJSON.serialize,
                data: [Promise.resolve({ error })],
              });
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: await new Response(stream).text(),
              });
            });
          }
          await save.click();
          await expect(
            page
              .locator("[data-sonner-toast]")
              .filter({
                hasText:
                  family === "list"
                    ? "Failed to update list"
                    : "Failed to save changes",
              })
              .first(),
          ).toBeVisible();
          await expect(field).toHaveValue(`Retained ${family} draft`);
          expect((await record()).title).toBe(`Latest ${family}`);
          const root = process.env.CONFLICT_EVIDENCE_DIR;
          if (root) {
            await mkdir(root, { recursive: true });
            await page.screenshot({
              path: path.join(
                root,
                `${device}-${family}-${changedWording ? "structured" : "native"}-conflict.png`,
              ),
              fullPage: true,
              animations: "disabled",
              style: "nextjs-portal { visibility: hidden; }",
            });
          }
          await expect(recovery).toBeVisible();
          await page.unroute(request);
          await recovery.click();
          await expect(field).toHaveValue(`Latest ${family}`);
          await expect(recovery).toBeHidden();
          await expect(save).toBeDisabled();

          if (changedWording) {
            await field.fill(`Retry ${family} draft`);
            await page.route(request, async (route) => {
              const stream = jsonlStreamProducer({
                maxDepth: Infinity,
                serialize: SuperJSON.serialize,
                data: [
                  Promise.resolve({
                    error: {
                      message: "Service changed. Load the latest status page.",
                      code: -32603,
                      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                    },
                  }),
                ],
              });
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: await new Response(stream).text(),
              });
            });
            await save.click();
            await expect(
              page
                .locator("[data-sonner-toast]")
                .filter({
                  hasText: "Service changed. Load the latest status page.",
                })
                .first(),
            ).toBeVisible();
            await expect(field).toHaveValue(`Retry ${family} draft`);
            await expect(recovery).toBeHidden();
            await expect(save).toBeEnabled();
            expect((await record()).title).toBe(`Latest ${family}`);
            await page.unroute(request);
          }

          await field.fill(`Saved ${family} ${device}`);
          await save.click();
          await expect
            .poll(async () => (await record()).title)
            .toBe(`Saved ${family} ${device}`);
          if (family !== "profile") await expect(editor).toBeHidden();
          else await expect(save).toBeDisabled();
          await page.goto(editorUrl);
          await expect(field).toHaveValue(`Saved ${family} ${device}`);
          await page.reload();
          await expect(field).toHaveValue(`Saved ${family} ${device}`);
        }
      } finally {
        await db.$transaction([
          db.list.update({
            where: { id: originalList.id },
            data: originalList,
          }),
          db.listing.update({
            where: { id: originalListing.id },
            data: originalListing,
          }),
          db.userProfile.update({
            where: { id: originalProfile.id },
            data: originalProfile,
          }),
        ]);
      }
    });
  }
}
