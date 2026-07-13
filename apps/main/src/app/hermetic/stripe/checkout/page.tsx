import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";

async function completeCheckout(formData: FormData) {
  "use server";
  if (!isHermeticMode()) redirect("/");

  const sessionId = formData.get("session_id");
  if (typeof sessionId !== "string") {
    redirect("/dashboard?hermeticCheckout=invalid");
  }
  const response = await fetch(
    `https://api.stripe.com/v1/test_helpers/checkout/sessions/${encodeURIComponent(sessionId)}/complete`,
    { method: "POST" },
  );
  if (!response.ok) redirect("/dashboard?hermeticCheckout=invalid");
  redirect("/subscribe/success?redirect=/dashboard");
}

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
          <h1 className="text-2xl font-semibold">Test checkout</h1>
          <p className="text-muted-foreground text-sm">
            No payment or external request will be made. Session {sessionId}
            exists only in this local integration runtime.
          </p>
        </div>
        <form action={completeCheckout}>
          <input type="hidden" name="session_id" value={sessionId} />
          <Button type="submit">Complete test checkout</Button>
        </form>
      </section>
    </main>
  );
}
