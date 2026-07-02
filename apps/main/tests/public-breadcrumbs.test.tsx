import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/63/6263",
}));

import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";

describe("PublicBreadcrumbs", () => {
  it("renders server-provided profile and listing breadcrumbs", () => {
    const { getByRole, getByText } = render(
      <PublicBreadcrumbs
        profile={{ id: "63", title: "Catalog" }}
        listingTitle="FromServer"
      />,
    );

    expect(getByRole("link", { name: "Catalogs" })).toHaveAttribute(
      "href",
      "/catalogs",
    );
    expect(getByRole("link", { name: "Catalog" })).toHaveAttribute(
      "href",
      "/63",
    );
    expect(getByText("FromServer")).toBeInTheDocument();
  });

  it("omits the listing crumb when the route has no server-provided listing title", () => {
    const { queryByText } = render(
      <PublicBreadcrumbs profile={{ id: "63", title: "Catalog" }} />,
    );

    expect(queryByText("Untitled Listing")).not.toBeInTheDocument();
  });
});
