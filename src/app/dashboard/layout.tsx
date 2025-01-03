import { cookies } from "next/headers";
import { DashboardClientLayout } from "./_components/dashboard-client-layout";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const cookieStore = cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <DashboardClientLayout defaultOpen={defaultOpen}>
      {children}
    </DashboardClientLayout>
  );
}
