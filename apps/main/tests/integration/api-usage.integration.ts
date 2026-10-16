import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures";

test("query authenticated API/MCP use and saved values without trusting spoofed headers", async ({
  request,
}, testInfo) => {
  const since = new Date().toISOString();
  const marker = crypto.randomUUID();
  const privateNote = `private-note-${marker}`;
  const db = new PrismaClient({
    adapter: new PrismaLibSql(
      { url: process.env.DATABASE_URL! },
      { timestampFormat: "unixepoch-ms" },
    ),
  });
  const headers = {
    authorization: "Bearer integration-oauth-seller",
    cookie: `unlogged-cookie=${marker}`,
    "x-user-id": "spoof-account",
    "x-clerk-user-id": "spoof-clerk",
    "x-oauth-client-id": "spoof-oauth",
    "x-forwarded-for": "198.51.100.123",
    "x-daylily-connecting-ip": "198.51.100.126",
    "x-real-ip": "198.51.100.124",
    "cf-connecting-ip": "198.51.100.125",
    "x-client-name": "claimed-smoke",
    "user-agent": "DaylilyUsageIntegration/1.0",
  };
  try {
    const create = await request.post("/api/v1/member/listing.create", {
      headers,
      data: {
        json: {
          title: `  Usage ${marker}  `,
          privateNote,
          price: 7.5,
          hidden: true,
          requestId: marker,
        },
      },
    });
    expect(create.status()).toBe(200);
    const created = (await create.json()).result.data.json;
    const saved = await db.listing.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(saved).toMatchObject({
      title: `Usage ${marker}`,
      privateNote,
      price: 7.5,
      status: "HIDDEN",
      userId: "integration-user",
    });

    const search = await request.post("/api/mcp/server", {
      headers,
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "daylily.list_listings",
          arguments: { q: marker, limit: 1 },
        },
      },
    });
    expect(search.status()).toBe(200);
    expect(
      (await search.json()).result.structuredContent.items.map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual([saved.id]);

    const apiSearch = await request.get("/api/v1/member/listing.page", {
      headers,
      params: { input: JSON.stringify({ json: { q: marker, limit: 1 } }) },
    });
    expect(apiSearch.status()).toBe(200);
    expect(
      (await apiSearch.json()).result.data.json.items.map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual([saved.id]);

    const memberDetail = await request.get("/api/v1/member/listing.get", {
      headers,
      params: { input: JSON.stringify({ json: { id: saved.id } }) },
    });
    expect(memberDetail.status()).toBe(200);
    expect((await memberDetail.json()).result.data.json.id).toBe(saved.id);
    const publicDetail = await request.get(
      "/api/v1/public/listings/integration-existing-listing",
      { headers },
    );
    expect(publicDetail.status()).toBe(200);
    expect((await publicDetail.json()).id).toBe("integration-existing-listing");

    const publicTool = await request.post("/api/mcp/server", {
      headers,
      data: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "daylily.search_public_listings",
          arguments: { q: "Existing", limit: 1 },
        },
      },
    });
    expect(publicTool.status()).toBe(200);
    expect(
      (await publicTool.json()).result.structuredContent.items,
    ).toHaveLength(1);
    for (const publicHeaders of [
      headers,
      { "x-client-name": "anonymous-fixture" },
    ]) {
      const publicSearch = await request.get(
        "/api/v1/public/listings?q=Existing&limit=1",
        { headers: publicHeaders },
      );
      expect(publicSearch.status()).toBe(200);
      expect(publicSearch.headers()["cache-control"]).toBe("no-store");
      expect(publicSearch.headers()["x-correlation-id"]).toBeUndefined();
      expect((await publicSearch.json()).items).toHaveLength(1);
    }

    const instructions = readFileSync(
      path.resolve("docs/debugging-correlation.md"),
      "utf8",
    );
    const query = instructions.match(/```jq\n([\s\S]*?)\n```/)![1]!;
    const serverLogPath = process.env.INTEGRATION_EVIDENCE_DIR
      ? path.join(process.env.INTEGRATION_EVIDENCE_DIR, "private/server.log")
      : path.resolve("tests/.tmp/integration-server.log");
    const report = (actor = "user_integration_seller") =>
      JSON.parse(
        execFileSync(
          "jq",
          [
            "-Rn",
            "--arg",
            "since",
            since,
            "--arg",
            "until",
            new Date(Date.now() + 1000).toISOString(),
            "--arg",
            "actor",
            actor,
            "--arg",
            "ip",
            "",
            query,
          ],
          { input: readFileSync(serverLogPath, "utf8"), encoding: "utf8" },
        ),
      );
    await expect.poll(() => report().operations).toBe(7);
    const result = report();
    expect(result.http_requests).toBe(7);
    expect(result.summed_returned_rows).toBe(7);
    const operations = result.records.filter(
      (record: { event: string }) => record.event === "api_usage_operation",
    );
    expect(operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "daylily.list_listings",
          request_q: marker,
          request_limit: 1,
          results_returned: 1,
        }),
        expect.objectContaining({
          operation: "listing.get",
          results_returned: 1,
        }),
        expect.objectContaining({
          operation: "public-listing-api",
          results_returned: 1,
        }),
        expect.objectContaining({
          operation: "listing.page",
          request_q: marker,
          request_limit: 1,
          results_returned: 1,
        }),
      ]),
    );
    for (const operation of operations) {
      expect(operation).toMatchObject({
        identity_source: "clerk_oauth",
        clerk_user_id: "user_integration_seller",
        oauth_client_id: "integration-oauth-client",
        connecting_ip_source: "unverified_proxy",
        declared_client: "claimed-smoke",
        traffic_class: "unclassified",
        release: process.env.SENTRY_RELEASE,
        outcome: "success",
      });
      expect(operation.connecting_ip).toBeUndefined();
      expect(operation.event_id).toBeTruthy();
      expect(operation.usage_operation_id).toBeTruthy();
    }
    expect(
      operations.find(
        (record: { operation: string }) =>
          record.operation === "daylily.search_public_listings",
      ),
    ).not.toHaveProperty("app_user_id");
    expect(report("integration-user").operations).toBe(4);
    const audit = result.records.find(
      (record: { event: string }) => record.event === "user_mutation",
    );
    expect(audit).toMatchObject({
      saved_evidence: "persisted_result",
      clientRequestId: marker,
      saved: {
        id: saved.id,
        title: saved.title,
        price: saved.price,
        status: saved.status,
      },
    });
    const write = operations.find(
      (record: { operation: string }) => record.operation === "listing.create",
    );
    expect(audit.usage_operation_id).toBe(write.usage_operation_id);
    const anonymous = report("").records.filter(
      (record: { identity_source: string }) =>
        record.identity_source === "anonymous",
    );
    expect(anonymous).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "api_usage_operation",
          operation: "public-listings-api",
          declared_client: "anonymous-fixture",
        }),
      ]),
    );
    const accountSql = instructions.match(/```sql\n([\s\S]*?)\n```/)![1]!;
    const current = await db.$queryRawUnsafe<
      Array<{ id: string; membershipStatus: string; email: string }>
    >(accountSql, "user_integration_seller");
    expect(current).toEqual([
      expect.objectContaining({
        id: "integration-user",
        membershipStatus: "active",
        email: "integration-seller@example.test",
      }),
    ]);
    await testInfo.attach("private-current-account", {
      body: JSON.stringify({
        queried_at: new Date().toISOString(),
        accounts: current,
      }),
      contentType: "application/json",
    });
    const serialized = JSON.stringify(result);
    for (const sensitive of [
      privateNote,
      "unlogged-cookie",
      "integration-oauth-seller",
      "spoof-account",
      "spoof-clerk",
      "spoof-oauth",
      "198.51.100.",
    ])
      expect(serialized).not.toContain(sensitive);
    expect(result.retained_observed.first).toBeTruthy();
    expect(result.coverage_limits.length).toBeGreaterThan(0);
    await testInfo.attach("private-usage-query", {
      body: serialized,
      contentType: "application/json",
    });
  } finally {
    await db.$disconnect();
  }
});
