#!/usr/bin/env node

// Run through with-env.mjs against the seeded local database. The script keeps
// the authorization code and access token in memory and prints no credentials.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const baseUrl = process.env.MCP_BASE_URL ?? "http://localhost:3217";
const clientId = process.env.DAYLILY_MCP_OAUTH_CLIENT_ID;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const redirectUri = "http://127.0.0.1:8788/callback";

if (!clientId || !publishableKey) {
  throw new Error(
    "Set DAYLILY_MCP_OAUTH_CLIENT_ID and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.",
  );
}
if (
  process.env.MCP_SMOKE_WRITE === "1" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)
) {
  throw new Error("The write smoke must target a loopback development server.");
}
const encodedHost = publishableKey.replace(/^pk_(?:test|live)_/, "");
const issuerHost = Buffer.from(encodedHost, "base64")
  .toString("utf8")
  .replace(/\$$/, "");
if (!issuerHost || issuerHost.includes("/") || issuerHost.includes(":")) {
  throw new Error("Could not read the Clerk issuer from the publishable key.");
}
const issuer = `https://${issuerHost}`;
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(24).toString("base64url");
const authorizeUrl = new URL("/oauth/authorize", issuer);
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("redirect_uri", redirectUri);
authorizeUrl.searchParams.set(
  "scope",
  process.env.MCP_SMOKE_WRITE === "1"
    ? "catalog:read catalog:write"
    : "catalog:read",
);
authorizeUrl.searchParams.set("state", state);
authorizeUrl.searchParams.set("code_challenge", challenge);
authorizeUrl.searchParams.set("code_challenge_method", "S256");

const server = createServer();
const callback = new Promise((resolve, reject) => {
  server.on("request", (request, response) => {
    const url = new URL(request.url ?? "/", redirectUri);
    if (url.pathname !== "/callback") {
      response.writeHead(404).end("Not found");
      return;
    }
    if (url.searchParams.get("state") !== state) {
      response.writeHead(400).end("Invalid state");
      reject(new Error("OAuth state did not match."));
      return;
    }
    const error = url.searchParams.get("error");
    if (error) {
      response.writeHead(400).end("OAuth authorization failed");
      reject(new Error(`OAuth authorization failed: ${error}`));
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      response.writeHead(400).end("Missing authorization code");
      reject(new Error("OAuth callback had no authorization code."));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end(
      "Daylily MCP OAuth callback received. You can close this tab.",
    );
    resolve(code);
  });
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(8788, "127.0.0.1", resolve);
});

process.stdout.write(`Open this authorization URL:\n${authorizeUrl}\n`);

try {
  const code = await callback;
  server.close();
  const tokenResponse = await fetch(new URL("/oauth/token", issuer), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  const tokenResult = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenResult.access_token) {
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} ${tokenResult.error ?? "unknown"}`,
    );
  }
  const tokenPayload = tokenResult.access_token.split(".")[1];
  const tokenFormat =
    tokenResult.access_token.split(".").length === 3 ? "jwt" : "opaque";
  let tokenAudience = null;
  if (tokenPayload) {
    try {
      tokenAudience =
        JSON.parse(Buffer.from(tokenPayload, "base64url").toString("utf8"))
          .aud ?? null;
    } catch {
      tokenAudience = null;
    }
  }

  const mcpUrl = new URL("/api/mcp/server", baseUrl);
  async function call(method, params, withToken = true) {
    const response = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-11-25",
        ...(withToken
          ? { Authorization: `Bearer ${tokenResult.access_token}` }
          : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const body = await response.json();
    return { httpStatus: response.status, body };
  }

  async function callMember(path, input, mutation = false) {
    const url = new URL(`/api/v1/member/${path}`, baseUrl);
    if (!mutation) {
      url.searchParams.set("input", JSON.stringify({ json: input }));
    }
    const response = await fetch(url, {
      method: mutation ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${tokenResult.access_token}`,
        "Content-Type": "application/json",
      },
      ...(mutation ? { body: JSON.stringify({ json: input }) } : {}),
    });
    return { httpStatus: response.status, body: await response.json() };
  }

  function requireToolData(result, label) {
    if (
      result.httpStatus !== 200 ||
      result.body.error ||
      result.body.result?.isError
    ) {
      throw new Error(`${label} failed.`);
    }
    return result.body.result?.structuredContent;
  }

  const initialize = await call("initialize", {
    protocolVersion: "2025-11-25",
  });
  const toolList = await call("tools/list");
  const unauthenticated = await call(
    "tools/call",
    { name: "daylily.get_profile", arguments: {} },
    false,
  );
  const profile = await call("tools/call", {
    name: "daylily.get_profile",
    arguments: {},
  });
  const dashboardTool = toolList.body.result?.tools?.find(
    (tool) => tool.name === "daylily.open_dashboard",
  );
  const removedTools = [
    "daylily.append_profile_paragraph",
    "daylily.edit_profile_paragraph",
    "daylily.update_profile_content",
    "daylily.upload_image",
    "daylily.prepare_image_upload",
    "daylily.attach_uploaded_image",
  ];
  const removedToolsAbsent = removedTools.every(
    (name) => !toolList.body.result?.tools?.some((tool) => tool.name === name),
  );
  const profileFields = toolList.body.result?.tools?.find(
    (tool) => tool.name === "daylily.update_profile",
  )?.inputSchema?.properties;
  const logoInputAbsent = profileFields && !("logoUrl" in profileFields);
  const profileBlockId = JSON.parse(
    profile.body.result?.structuredContent?.profile?.content ?? "null",
  )?.blocks?.find((block) => typeof block.id === "string")?.id;
  if (!profileBlockId) {
    throw new Error(
      "The seeded member profile has no addressable story block.",
    );
  }
  const blockHandoff = await call("tools/call", {
    name: "daylily.open_dashboard",
    arguments: {
      destination: "remove_profile_content_block",
      blockId: profileBlockId,
    },
  });
  const memberBlockHandoff = await callMember("handoff.get", {
    destination: "remove_profile_content_block",
    blockId: profileBlockId,
  });
  const blockReviewUrl = blockHandoff.body.result?.structuredContent?.url;
  const blockReviewPath = blockReviewUrl
    ? `${new URL(blockReviewUrl).pathname}${new URL(blockReviewUrl).search}${new URL(blockReviewUrl).hash}`
    : null;
  const page = await call("tools/call", {
    name: "daylily.list_listings",
    arguments: { limit: 1 },
  });
  const profileId = profile.body.result?.structuredContent?.profile?.id;
  const profileImageId =
    profile.body.result?.structuredContent?.profile?.images?.[0]?.id;
  const exactImage =
    profileId && profileImageId
      ? await call("tools/call", {
          name: "daylily.get_image",
          arguments: {
            type: "profile",
            referenceId: profileId,
            imageId: profileImageId,
          },
        })
      : null;
  const mcpImagePage = profileId
    ? await call("tools/call", {
        name: "daylily.list_images",
        arguments: { type: "profile", referenceId: profileId, limit: 2 },
      })
    : null;
  const memberImagePage = profileId
    ? await callMember("image.listForTarget", {
        type: "profile",
        referenceId: profileId,
        limit: 2,
      })
    : null;
  const imageCursor = mcpImagePage?.body.result?.structuredContent?.nextCursor;
  const mcpImageNextPage = imageCursor
    ? await call("tools/call", {
        name: "daylily.list_images",
        arguments: {
          type: "profile",
          referenceId: profileId,
          limit: 2,
          cursor: imageCursor,
        },
      })
    : null;
  const memberImageNextPage = imageCursor
    ? await callMember("image.listForTarget", {
        type: "profile",
        referenceId: profileId,
        limit: 2,
        cursor: imageCursor,
      })
    : null;
  const listingId = page.body.result?.structuredContent?.items?.[0]?.id;
  if (!listingId) throw new Error("The authenticated listing page was empty.");
  const listingImageEditor = await call("tools/call", {
    name: "daylily.open_dashboard",
    arguments: { destination: "manage_listing_images", id: listingId },
  });
  const profileImageEditor = await call("tools/call", {
    name: "daylily.open_dashboard",
    arguments: { destination: "manage_profile_images" },
  });
  const memberListingImageEditor = await callMember("handoff.get", {
    destination: "manage_listing_images",
    id: listingId,
  });
  const memberProfileImageEditor = await callMember("handoff.get", {
    destination: "manage_profile_images",
  });
  const imageEditorsMatch = [
    [listingImageEditor, memberListingImageEditor, "listing-images"],
    [profileImageEditor, memberProfileImageEditor, "profile-images"],
  ].every(([mcp, member, anchor]) => {
    const url = new URL(requireToolData(mcp, "Open image editor").url);
    return (
      url.origin === new URL(baseUrl).origin &&
      url.hash === `#${anchor}` &&
      member.httpStatus === 200 &&
      `${url.pathname}${url.search}${url.hash}` ===
        member.body.result?.data?.json?.dashboardPath
    );
  });
  const handoff = await call("tools/call", {
    name: "daylily.open_dashboard",
    arguments: { destination: "delete_listing", id: listingId },
  });
  const memberHandoff = await callMember("handoff.get", {
    destination: "delete_listing",
    id: listingId,
  });
  const reviewUrl = handoff.body.result?.structuredContent?.url;
  const reviewPath = reviewUrl
    ? `${new URL(reviewUrl).pathname}${new URL(reviewUrl).search}`
    : null;
  const memberPage = await callMember("listing.page", { limit: 1 });
  const readOnlyWriteRejected =
    process.env.MCP_SMOKE_WRITE === "1"
      ? null
      : (
          await callMember(
            "list.create",
            { requestId: randomUUID(), title: "Read-only denial proof" },
            true,
          )
        ).httpStatus === 403;

  let writeProof = null;
  if (process.env.MCP_SMOKE_WRITE === "1") {
    const created = await call("tools/call", {
      name: "daylily.create_list",
      arguments: { requestId: randomUUID(), title: "Local OAuth MCP proof" },
    });
    const listId = requireToolData(created, "Create list")?.list?.id;
    if (!listId) {
      throw new Error("MCP list creation returned no list id.");
    }
    const emptyListReview = await call("tools/call", {
      name: "daylily.open_dashboard",
      arguments: { destination: "delete_list", id: listId },
    });
    const listingCreated = await call("tools/call", {
      name: "daylily.create_listing",
      arguments: {
        requestId: randomUUID(),
        title: "Local OAuth MCP listing proof",
        hidden: true,
      },
    });
    const createdListingId = requireToolData(listingCreated, "Create listing")
      ?.listing?.id;
    if (!createdListingId) {
      throw new Error("MCP listing creation returned no listing id.");
    }
    const listingUpdated = await call("tools/call", {
      name: "daylily.update_listing",
      arguments: {
        listingId: createdListingId,
        expectedUpdatedAt: requireToolData(listingCreated, "Create listing")
          ?.listing?.updatedAt,
        description: "Edited by local OAuth proof",
      },
    });
    const memberCultivars = await callMember("cultivar.search", {
      query: "stel",
    });
    const cultivarId = memberCultivars.body.result?.data?.json?.[0]?.id;
    if (memberCultivars.httpStatus !== 200 || !cultivarId) {
      throw new Error("The local cultivar search returned no reference id.");
    }
    const linked = await call("tools/call", {
      name: "daylily.link_listing_to_cultivar",
      arguments: {
        listingId: createdListingId,
        cultivarReferenceId: cultivarId,
      },
    });
    const syncedName = await call("tools/call", {
      name: "daylily.sync_listing_cultivar_name",
      arguments: { listingId: createdListingId },
    });
    const syncedTitle = requireToolData(
      syncedName,
      "Sync listing cultivar name",
    )?.listing?.title;
    const memberSyncedName = await callMember(
      "listing.syncCultivarName",
      { id: createdListingId },
      true,
    );
    const added = await call("tools/call", {
      name: "daylily.add_listing_to_list",
      arguments: { listingId: createdListingId, listId },
    });
    const listMembers = await call("tools/call", {
      name: "daylily.list_listings",
      arguments: { listId, limit: 10 },
    });
    const removalReview = await call("tools/call", {
      name: "daylily.open_dashboard",
      arguments: {
        destination: "remove_listings_from_list",
        id: listId,
        listingIds: [createdListingId],
      },
    });
    const nonemptyListReview = await call("tools/call", {
      name: "daylily.open_dashboard",
      arguments: { destination: "delete_list", id: listId },
    });
    const listBeforeUpdate = await call("tools/call", {
      name: "daylily.get_list",
      arguments: { id: listId },
    });
    const updated = await call("tools/call", {
      name: "daylily.update_list",
      arguments: {
        listId,
        expectedUpdatedAt: requireToolData(
          listBeforeUpdate,
          "Read list before update",
        )?.list?.updatedAt,
        description: "Updated by local OAuth proof",
      },
    });
    const readBack = await call("tools/call", {
      name: "daylily.get_list",
      arguments: { id: listId },
    });
    const profileBeforeUpdate = await callMember("profile.get", {});
    const profileUpdated = await call("tools/call", {
      name: "daylily.update_profile",
      arguments: {
        expectedUpdatedAt:
          profileBeforeUpdate.body.result?.data?.json?.updatedAt ?? null,
        location: "Local OAuth proof",
      },
    });
    const updatedProfile = requireToolData(
      profileUpdated,
      "Update profile",
    )?.profile;
    const memberUpdate = await callMember(
      "list.update",
      {
        id: listId,
        expectedUpdatedAt:
          readBack.body.result?.structuredContent?.list?.updatedAt,
        data: { description: "Updated by member HTTP proof" },
      },
      true,
    );
    const memberReadBack = await callMember("list.get", { id: listId });
    const imagesBeforeReorder = await callMember("image.listForTarget", {
      type: "profile",
      referenceId: profileId,
      limit: 100,
    });
    const reorderedIds = imagesBeforeReorder.body.result?.data?.json?.items
      ?.toSorted((a, b) => a.order - b.order)
      .map((image) => image.id)
      .reverse();
    if (!reorderedIds || reorderedIds.length < 2) {
      throw new Error("The seeded profile needs two images for reorder proof.");
    }
    const reordered = await call("tools/call", {
      name: "daylily.reorder_images",
      arguments: {
        type: "profile",
        referenceId: profileId,
        imageIds: reorderedIds,
      },
    });
    requireToolData(reordered, "Reorder profile images");
    const imagesAfterReorder = await callMember("image.listForTarget", {
      type: "profile",
      referenceId: profileId,
      limit: 100,
    });
    const storedImageIds = imagesAfterReorder.body.result?.data?.json?.items
      ?.toSorted((a, b) => a.order - b.order)
      .map((image) => image.id);
    writeProof = {
      listId,
      created: !created.body.error && !created.body.result?.isError,
      updated: !updated.body.error && !updated.body.result?.isError,
      listingCreated: Boolean(createdListingId),
      listingUpdated:
        requireToolData(listingUpdated, "Update listing")?.listing
          ?.description === "Edited by local OAuth proof",
      cultivarLinked:
        requireToolData(linked, "Link cultivar")?.listing
          ?.cultivarReferenceId === cultivarId,
      cultivarNameSynced:
        Boolean(syncedTitle) &&
        syncedTitle !== "Local OAuth MCP listing proof" &&
        memberSyncedName.httpStatus === 200 &&
        memberSyncedName.body.result?.data?.json?.title === syncedTitle,
      addedToList:
        requireToolData(added, "Add listing to list")?.listingId ===
          createdListingId &&
        requireToolData(listMembers, "List members")?.items?.some(
          (item) => item.id === createdListingId,
        ),
      emptyListReview:
        requireToolData(
          emptyListReview,
          "Review empty list deletion",
        )?.url?.includes("intent=delete") === true,
      removalReview:
        requireToolData(removalReview, "Review list removal")?.url?.includes(
          "remove=",
        ) === true,
      nonemptyListDeletionBlocked:
        requireToolData(nonemptyListReview, "Review nonempty list deletion")
          ?.canComplete === false,
      profileUpdated: updatedProfile?.location === "Local OAuth proof",
      profileImagesReordered:
        imagesAfterReorder.httpStatus === 200 &&
        JSON.stringify(storedImageIds) === JSON.stringify(reorderedIds),
      readBack:
        readBack.body.result?.structuredContent?.list?.description ===
        "Updated by local OAuth proof",
      memberHttpUpdated:
        memberUpdate.httpStatus === 200 &&
        memberReadBack.body.result?.data?.json?.description ===
          "Updated by member HTTP proof",
    };
  }

  const mcpImageItems = mcpImagePage?.body.result?.structuredContent?.items;
  const memberImageItems = memberImagePage?.body.result?.data?.json?.items;
  const firstImagePageMatches =
    Array.isArray(mcpImageItems) &&
    Array.isArray(memberImageItems) &&
    memberImagePage.httpStatus === 200 &&
    JSON.stringify(mcpImageItems.map((image) => image.id)) ===
      JSON.stringify(memberImageItems.map((image) => image.id)) &&
    imageCursor === memberImagePage.body.result?.data?.json?.nextCursor;
  const nextImagePageMatches =
    !imageCursor ||
    (mcpImageNextPage?.httpStatus === 200 &&
      memberImageNextPage?.httpStatus === 200 &&
      JSON.stringify(
        mcpImageNextPage.body.result?.structuredContent?.items?.map(
          (image) => image.id,
        ),
      ) ===
        JSON.stringify(
          memberImageNextPage.body.result?.data?.json?.items?.map(
            (image) => image.id,
          ),
        ) &&
      mcpImageNextPage.body.result?.structuredContent?.items?.[0]?.id !==
        mcpImageItems?.[0]?.id);

  const result = {
    initialize: initialize.body.result?.protocolVersion,
    tokenFormat,
    tokenAudience,
    toolCount: toolList.body.result?.tools?.length ?? null,
    removedToolsAbsent,
    logoInputAbsent: Boolean(logoInputAbsent),
    imageEditorsMatch,
    unauthenticatedRejected: unauthenticated.body.result?.isError === true,
    profileSlug: profile.body.result?.structuredContent?.profile?.slug ?? null,
    listingPageCount: page.body.result?.structuredContent?.items?.length ?? 0,
    memberHttpPageCount: memberPage.body.result?.data?.json?.items?.length ?? 0,
    exactImageRead:
      !profileImageId ||
      exactImage?.body.result?.structuredContent?.image?.id === profileImageId,
    imagePagesMatch: firstImagePageMatches && nextImagePageMatches,
    readOnlyWriteRejected,
    deleteReviewUrl: reviewUrl ?? null,
    memberHandoffMatches:
      memberHandoff.httpStatus === 200 &&
      reviewPath === memberHandoff.body.result?.data?.json?.dashboardPath,
    blockHandoffAdvertised:
      dashboardTool?.inputSchema?.properties?.destination?.enum?.includes(
        "remove_profile_content_block",
      ) === true &&
      dashboardTool?.inputSchema?.properties?.blockId?.maxLength === 128,
    blockHandoffMatches:
      memberBlockHandoff.httpStatus === 200 &&
      blockReviewPath ===
        memberBlockHandoff.body.result?.data?.json?.dashboardPath &&
      blockReviewPath ===
        `/dashboard/profile?contentBlock=${encodeURIComponent(profileBlockId)}#profile-content`,
    writeProof,
    errors: [
      profile,
      page,
      handoff,
      memberHandoff,
      blockHandoff,
      memberBlockHandoff,
      listingImageEditor,
      profileImageEditor,
      memberListingImageEditor,
      memberProfileImageEditor,
      mcpImagePage,
      memberImagePage,
      mcpImageNextPage,
      memberImageNextPage,
    ]
      .filter(Boolean)
      .map(({ body }) => body.error?.message ?? body.result?.isError)
      .filter(Boolean),
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (
    result.initialize !== "2025-11-25" ||
    result.toolCount !== 26 ||
    !result.removedToolsAbsent ||
    !result.logoInputAbsent ||
    !result.imageEditorsMatch ||
    !result.unauthenticatedRejected ||
    !result.profileSlug ||
    result.memberHttpPageCount !== 1 ||
    !result.exactImageRead ||
    !result.imagePagesMatch ||
    (process.env.MCP_SMOKE_WRITE !== "1" && !result.readOnlyWriteRejected) ||
    !result.deleteReviewUrl?.includes("intent=delete") ||
    !result.memberHandoffMatches ||
    !result.blockHandoffAdvertised ||
    !result.blockHandoffMatches ||
    result.errors.length ||
    (process.env.MCP_SMOKE_WRITE === "1" &&
      (!result.writeProof?.created ||
        !result.writeProof?.updated ||
        !result.writeProof?.listingCreated ||
        !result.writeProof?.listingUpdated ||
        !result.writeProof?.cultivarLinked ||
        !result.writeProof?.cultivarNameSynced ||
        !result.writeProof?.addedToList ||
        !result.writeProof?.emptyListReview ||
        !result.writeProof?.removalReview ||
        !result.writeProof?.nonemptyListDeletionBlocked ||
        !result.writeProof?.profileUpdated ||
        !result.writeProof?.profileImagesReordered ||
        !result.writeProof?.readBack ||
        !result.writeProof?.memberHttpUpdated))
  ) {
    process.exitCode = 1;
  }
} finally {
  server.close();
}
