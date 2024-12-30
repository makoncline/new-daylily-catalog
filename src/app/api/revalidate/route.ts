import { revalidatePath } from "next/cache";

export async function GET() {
  // Revalidate all dynamic routes
  revalidatePath("/", "layout");
  return new Response("OK", { status: 200 });
}
