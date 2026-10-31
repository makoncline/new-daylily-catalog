// @vitest-environment node

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTRPCClient } from "@trpc/client";
import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import SuperJSON from "superjson";
import { createClientLinks } from "@/trpc/client-links";

const t = initTRPC
  .context<{ headers: Headers }>()
  .create({ transformer: SuperJSON });
let writes = 0;
const member = t.procedure.use(({ ctx, next }) => {
  const owner =
    ctx.headers.get("authorization") === "Bearer current-token"
      ? "member-1"
      : ctx.headers.get("authorization") === "Bearer other-account-token"
        ? "member-2"
        : null;
  if (!owner) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.headers.get("x-dashboard-member-id") !== owner)
    throw new TRPCError({ code: "PRECONDITION_FAILED" });
  return next();
});
const router = t.router({
  dashboardV2: t.router({
    bootstrap: t.router({ catalog: member.query(() => "catalog") }),
    save: member.mutation(() => ++writes),
  }),
  public: t.procedure.query(({ ctx }) => ctx.headers.get("authorization")),
});
const fetchMock = vi.fn<typeof fetch>((input, init) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(input, init),
    router,
    createContext: ({ req }) => ({ headers: req.headers }),
  }),
);

beforeEach(() => {
  writes = 0;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("waits for refresh before bootstrap and batched writes, then uses the next token", async () => {
  let resolveToken!: (token: string) => void;
  const refreshed = new Promise<string>((resolve) => {
    resolveToken = resolve;
  });
  const getToken = vi.fn(() => refreshed);
  const client = createTRPCClient<typeof router>({
    links: createClientLinks("member-1", getToken),
  });
  const requests = Promise.all([
    client.dashboardV2.bootstrap.catalog.query(),
    client.dashboardV2.save.mutate(),
  ]);
  await vi.waitFor(() => expect(getToken).toHaveBeenCalledTimes(2));
  expect(fetchMock).not.toHaveBeenCalled();
  resolveToken("current-token");
  await expect(requests).resolves.toEqual(["catalog", 1]);
  expect(writes).toBe(1);
  getToken.mockResolvedValue("other-account-token");
  await expect(client.dashboardV2.save.mutate()).rejects.toMatchObject({
    data: { code: "PRECONDITION_FAILED" },
  });
  expect(writes).toBe(1);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it.each([null, new Error("Refresh failed")])(
  "does not dispatch a member write without a token: %s",
  async (result) => {
    const getToken = async () => {
      if (result instanceof Error) throw result;
      return result;
    };
    const client = createTRPCClient<typeof router>({
      links: createClientLinks("member-1", getToken),
    });
    await expect(client.dashboardV2.save.mutate()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(writes).toBe(0);
  },
);

it("authenticates provider reads and keeps anonymous public reads available", async () => {
  const authenticated = createTRPCClient<typeof router>({
    links: createClientLinks(undefined, async () => "current-token"),
  });
  await expect(authenticated.public.query()).resolves.toBe(
    "Bearer current-token",
  );
  const anonymous = createTRPCClient<typeof router>({
    links: createClientLinks(),
  });
  await expect(anonymous.public.query()).resolves.toBeNull();
});
