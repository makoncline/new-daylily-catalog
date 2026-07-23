import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePageClient from "@/app/(public)/_components/home-page-client";

describe("homepage grower links", () => {
  it("links to both grower use-case pages", () => {
    render(<HomePageClient />);

    expect(
      screen.getByRole("link", { name: "Daylily database software" }),
    ).toHaveAttribute("href", "/daylily-database-software");
    expect(
      screen.getByRole("link", { name: "Sell daylilies online" }),
    ).toHaveAttribute("href", "/sell-daylilies-online");
  });
});
