import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/utils/json-ld";

describe("serializeJsonLd", () => {
  it("escapes script-breaking characters while preserving JSON values", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Evil </script><script>alert("xss")</script>`,
      description: "A & B > C",
      separator: "\u2028\u2029",
    };

    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script");
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual(payload);
  });
});
