import { z } from "zod";

export const nullableText = () =>
  z.preprocess(
    (v: string | null | undefined) => (v === "" ? null : v),
    z.string().optional().nullable(),
  );

export const nullableSlug = (
  pattern: RegExp,
  min = 5,
  minMessage = "URL must be at least 5 characters",
  regexMessage = "Only letters, numbers, and hyphens are allowed",
) =>
  z.preprocess(
    (v: string | null | undefined) => (v === "" ? null : v),
    z
      .string()
      .min(min, minMessage)
      .regex(pattern, regexMessage)
      .optional()
      .nullable(),
  );
