"use server";

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PublicdNav } from "@/components/public-nav";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getUserByClerkId } from "@/server/api/trpc";
import { syncStripeSubscriptionToKV } from "@/server/stripe/sync-subscription";

export default async function SubscribeSuccessPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const user = await getUserByClerkId(userId);
  if (!user?.stripeCustomerId) {
    redirect("/dashboard");
  }

  await syncStripeSubscriptionToKV(user.stripeCustomerId);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-4">
        <PublicdNav />
      </header>

      <main
        className="flex-1 px-4 py-10 lg:px-10 lg:py-14"
        data-testid="subscribe-success-page"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,560px)] lg:items-start lg:gap-8">
          <div className="space-y-6 py-2 lg:py-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                Membership activated
              </p>
              <h1 className="text-5xl leading-[0.92] font-bold tracking-tight lg:text-7xl">
                <span className="block">You&apos;re all set.</span>
                <span className="block">Welcome to Pro.</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-2xl leading-tight lg:text-3xl">
                Your Pro membership is active. You can now continue building and
                managing your catalog from your dashboard.
              </p>
            </div>

            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
              <Link href="/dashboard" data-testid="subscribe-success-dashboard-link">
                Go to dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="bg-card rounded-[2rem] border p-6 shadow-sm lg:p-10">
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              What&apos;s unlocked
            </p>
            <ul className="mt-6 space-y-4 text-xl leading-tight lg:text-2xl">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Custom catalog URL for your seller profile</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Unlimited listings, lists, and image uploads</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Expanded discovery across catalogs and cultivar pages</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day trial is active now
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
