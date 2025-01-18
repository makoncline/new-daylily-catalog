"use server";

import { api } from "@/trpc/server";
import { AppSidebar } from "./app-sidebar";

export async function AppSidebarWrapper() {
  try {
    // Fetch initial user data on the server
    const initialUser = await api.user.getCurrentUser();
    return <AppSidebar initialUser={initialUser} />;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    // Return the sidebar without initial user data
    return <AppSidebar initialUser={null} />;
  }
}
