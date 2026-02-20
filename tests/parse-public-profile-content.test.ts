import { describe, expect, it } from "vitest";
import { parsePublicProfileContent } from "@/server/db/parse-public-profile-content";

describe("parsePublicProfileContent", () => {
  it("returns parsed output data when content has EditorJS block structure", () => {
    const parsed = parsePublicProfileContent(
      JSON.stringify({
        time: 1,
        version: "2.0.0",
        blocks: [
          {
            id: "a",
            type: "paragraph",
            data: { text: "Hello" },
          },
        ],
      }),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.blocks).toHaveLength(1);
  });

  it("returns null when content is invalid JSON", () => {
    expect(parsePublicProfileContent("{not-json")).toBeNull();
  });

  it("returns null when parsed JSON is missing EditorJS blocks", () => {
    expect(
      parsePublicProfileContent(JSON.stringify({ foo: "bar", blocks: "oops" })),
    ).toBeNull();
  });
});
