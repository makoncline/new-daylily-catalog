import { isCanonicalStorefrontBearerToken } from "@daylily-catalog/storefront-contract";
import { z } from "zod";

export const storefrontSellerIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

function skipJsonWhitespace(value: string, startIndex: number) {
  let index = startIndex;
  while (
    value[index] === " " ||
    value[index] === "\t" ||
    value[index] === "\n" ||
    value[index] === "\r"
  ) {
    index += 1;
  }
  return index;
}

function readJsonString(value: string, startIndex: number) {
  if (value[startIndex] !== '"') {
    throw new Error("Expected a JSON string.");
  }

  let escaped = false;
  for (let index = startIndex + 1; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      const parsed = JSON.parse(value.slice(startIndex, index + 1)) as unknown;
      if (typeof parsed !== "string") {
        throw new Error("Expected a JSON string.");
      }
      return { nextIndex: index + 1, value: parsed };
    }
  }

  throw new Error("The JSON string is incomplete.");
}

function parseTokenMap(value: string | undefined) {
  if (!value) {
    throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is required.");
  }

  let index = skipJsonWhitespace(value, 0);
  if (value[index] !== "{") {
    throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON must be a JSON object.");
  }
  index = skipJsonWhitespace(value, index + 1);

  const tokens = new Map<string, string>();
  const tokenValues = new Set<string>();
  if (value[index] === "}") {
    index = skipJsonWhitespace(value, index + 1);
    if (index !== value.length) {
      throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is invalid.");
    }
    return tokens;
  }

  while (index < value.length) {
    const keyResult = readJsonString(value, index);
    const sellerIdResult = storefrontSellerIdSchema.safeParse(keyResult.value);
    if (
      !sellerIdResult.success ||
      sellerIdResult.data !== keyResult.value ||
      tokens.has(keyResult.value)
    ) {
      throw new Error(
        "STOREFRONT_INQUIRY_TOKENS_JSON has an invalid seller key.",
      );
    }

    index = skipJsonWhitespace(value, keyResult.nextIndex);
    if (value[index] !== ":") {
      throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is invalid.");
    }
    index = skipJsonWhitespace(value, index + 1);

    const tokenResult = readJsonString(value, index);
    const token = tokenResult.value;
    if (!isCanonicalStorefrontBearerToken(token)) {
      throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON has an invalid token.");
    }
    if (tokenValues.has(token)) {
      throw new Error(
        "STOREFRONT_INQUIRY_TOKENS_JSON must use a different token for each seller.",
      );
    }

    tokens.set(keyResult.value, token);
    tokenValues.add(token);
    index = skipJsonWhitespace(value, tokenResult.nextIndex);

    if (value[index] === "}") {
      index = skipJsonWhitespace(value, index + 1);
      if (index !== value.length) {
        throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is invalid.");
      }
      return tokens;
    }
    if (value[index] !== ",") {
      throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is invalid.");
    }
    index = skipJsonWhitespace(value, index + 1);
  }

  throw new Error("STOREFRONT_INQUIRY_TOKENS_JSON is incomplete.");
}

function getConfiguredStorefrontSellerIds(
  configuredSellerIds: string | undefined,
) {
  const values = configuredSellerIds?.split(",");
  if (!values?.length) {
    throw new Error("PUBLIC_STOREFRONT_SELLER_IDS is required.");
  }

  const sellerIds = values.map((value) => value.trim());
  if (
    sellerIds.some(
      (value) => !storefrontSellerIdSchema.safeParse(value).success,
    ) ||
    new Set(sellerIds).size !== sellerIds.length
  ) {
    throw new Error("PUBLIC_STOREFRONT_SELLER_IDS is invalid.");
  }

  return new Set(sellerIds);
}

export function isConfiguredStorefrontSeller(
  sellerId: string,
  configuredSellerIds: string | undefined,
) {
  return getConfiguredStorefrontSellerIds(configuredSellerIds).has(sellerId);
}

export function getConfiguredStorefrontInquiryToken(
  sellerId: string,
  configuredTokensJson: string | undefined,
  configuredSellerIds: string | undefined,
) {
  const sellerIds = getConfiguredStorefrontSellerIds(configuredSellerIds);
  const tokens = parseTokenMap(configuredTokensJson);

  for (const configuredSellerId of tokens.keys()) {
    if (!sellerIds.has(configuredSellerId)) {
      throw new Error(
        "STOREFRONT_INQUIRY_TOKENS_JSON contains a seller outside PUBLIC_STOREFRONT_SELLER_IDS.",
      );
    }
  }

  return tokens.get(sellerId);
}
