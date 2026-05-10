import type { Metadata } from "next";
import { DashboardDbLoadingScreen } from "@/app/dashboard/_components/dashboard-db-loading-screen";

export const metadata: Metadata = {
  title: "Kitchen Sink | Daylily Catalog",
  description: "Internal component preview page.",
};

export default function KitchenSinkPage() {
  return <DashboardDbLoadingScreen status="loading" isExiting={false} />;
}
