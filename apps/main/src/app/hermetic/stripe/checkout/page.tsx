import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";

export default async function HermeticStripeCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  if (!isHermeticMode()) redirect("/");
  const { session_id: sessionId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-svh max-w-lg items-center px-6">
      <section className="w-full space-y-5 rounded-lg border p-8 shadow-sm">
        <div>
          <p className="text-primary text-sm font-medium">Offline Stripe</p>
          <h1 className="text-2xl font-semibold">Test checkout complete</h1>
          <p className="text-muted-foreground text-sm">
            No payment or external request was made. Session {sessionId} is
            active only in this temporary database.
          </p>
        </div>
        <Button asChild>
          <Link href="/subscribe/success?redirect=/dashboard">
            Return to dashboard
          </Link>
        </Button>
      </section>
    </main>
  );
}
