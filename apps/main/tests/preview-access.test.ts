// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { preparePreviewAccess } from "../e2e/preview-access";

function fixture(status = 307) {
  const dispose = vi.fn();
  const get = vi.fn().mockResolvedValue({
    status: () => status,
    dispose,
  } as unknown as APIResponse);
  const request = { get } as unknown as APIRequestContext;
  return { request, get, dispose };
}

describe("preview access cookie", () => {
  it("uses one origin-only request and does not forward the secret through redirects", async () => {
    const { request, get, dispose } = fixture();
    await preparePreviewAccess(
      request,
      "https://daylily-abc.vercel.app/sign-in?next=/dashboard",
      "test-secret",
    );
    expect(get).toHaveBeenCalledExactlyOnceWith(
      "https://daylily-abc.vercel.app/",
      {
        headers: {
          "x-vercel-protection-bypass": "test-secret",
          "x-vercel-set-bypass-cookie": "true",
        },
        maxRedirects: 0,
      },
    );
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("supports the existing preview alias during migration", async () => {
    const { request, get } = fixture();
    await preparePreviewAccess(
      request,
      "https://abc.deploy-preview.daylilycatalog.com",
      "test-secret",
    );
    expect(get.mock.calls[0]?.[0]).toBe(
      "https://abc.deploy-preview.daylilycatalog.com/",
    );
  });

  it.each([
    "https://clerk.example.com",
    "https://daylilycatalog.com",
    "https://preview.vercel.app.attacker.example",
    "http://preview.vercel.app",
    "https://user:password@preview.vercel.app",
  ])("does not send the secret to %s", async (url) => {
    const { request, get } = fixture();
    await expect(
      preparePreviewAccess(request, url, "test-secret"),
    ).rejects.toThrow("trusted HTTPS preview origin");
    expect(get).not.toHaveBeenCalled();
  });

  it("does not use a bypass for ordinary local or unprotected runs", async () => {
    const { request, get } = fixture();
    await preparePreviewAccess(request, undefined, "test-secret");
    await preparePreviewAccess(request, "http://localhost:3100", "test-secret");
    await preparePreviewAccess(
      request,
      "https://preview.vercel.app",
      undefined,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it("does not log request headers when the access request fails", async () => {
    const { request, get } = fixture();
    get.mockRejectedValue(
      new Error("network failure: x-vercel-protection-bypass: test-secret"),
    );
    await expect(
      preparePreviewAccess(
        request,
        "https://preview.vercel.app",
        "test-secret",
      ),
    ).rejects.toThrow(/^Preview access request failed before Clerk loaded\.$/);
  });

  it("reports an access failure without including credentials", async () => {
    const { request, dispose } = fixture(403);
    await expect(
      preparePreviewAccess(
        request,
        "https://preview.vercel.app",
        "test-secret",
      ),
    ).rejects.toThrow("Preview access failed before Clerk loaded (HTTP 403).");
    expect(dispose).toHaveBeenCalledOnce();
  });
});
