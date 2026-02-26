import { describe, expect, it } from "vitest";
import { profileFormSchema } from "@/types/schemas/profile";
import { SLUG_INPUT_PATTERN, isValidSlug } from "@/lib/utils/slugify";

const baseProfileFormInput = {
  title: null,
  slug: null,
  description: null,
  location: null,
  logoUrl: null,
};

describe("profile slug rules", () => {
  it("matches allowed profile-form input characters", () => {
    expect(SLUG_INPUT_PATTERN.test("graceful_petals-daylilies")).toBe(true);
    expect(SLUG_INPUT_PATTERN.test("graceful petals")).toBe(true);
    expect(SLUG_INPUT_PATTERN.test("graceful.petals")).toBe(false);
    expect(SLUG_INPUT_PATTERN.test("GracefulPetals")).toBe(false);
  });

  it("applies profile form schema constraints", () => {
    expect(
      profileFormSchema.safeParse({
        ...baseProfileFormInput,
        slug: "graceful_petals-daylilies",
      }).success,
    ).toBe(true);

    expect(
      profileFormSchema.safeParse({
        ...baseProfileFormInput,
        slug: "abcd",
      }).success,
    ).toBe(false);

    expect(
      profileFormSchema.safeParse({
        ...baseProfileFormInput,
        slug: "graceful.petals",
      }).success,
    ).toBe(false);

    const parsedEmpty = profileFormSchema.parse({
      ...baseProfileFormInput,
      slug: "",
    });
    expect(parsedEmpty.slug).toBeNull();
  });

  it("enforces final server-side slug validation rules", () => {
    expect(isValidSlug("graceful_petals_daylilies")).toBe(true);
    expect(isValidSlug("fussellfarms")).toBe(true);
    expect(isValidSlug("ab_cd")).toBe(true);

    expect(isValidSlug("abcd")).toBe(false);
    expect(isValidSlug("graceful petals")).toBe(false);
    expect(isValidSlug("graceful.petals")).toBe(false);
    expect(isValidSlug("GracefulPetals")).toBe(false);
    expect(isValidSlug("a".repeat(51))).toBe(false);
  });
});
