import { describe, expect, it } from "vitest";
import { rebaseFormValues } from "@/lib/rebase-form-values";

describe("rebaseFormValues", () => {
  it("keeps a draft and adopts server changes to other fields", () => {
    expect(
      rebaseFormValues(
        { title: "Local title", description: "Old description" },
        { title: "Old title", description: "Old description" },
        { title: "Old title", description: "Remote description" },
      ),
    ).toEqual({ title: "Local title", description: "Remote description" });
  });

  it("accepts an intentional server value already present in the form", () => {
    expect(
      rebaseFormValues(
        { title: "Synced cultivar", description: "Local description" },
        { title: "Old title", description: "Old description" },
        { title: "Synced cultivar", description: "Old description" },
      ),
    ).toEqual({ title: "Synced cultivar", description: "Local description" });
  });

  it("keeps the old version when both sides changed the same field", () => {
    expect(
      rebaseFormValues(
        { title: "Local title", description: "Old description" },
        { title: "Old title", description: "Old description" },
        { title: "Remote title", description: "Old description" },
      ),
    ).toBeNull();
  });
});
