"use client";

import * as React from "react";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome to Daylily Catalog</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your daylily collection and showcase your garden.
      </p>
    </div>
  );
}
