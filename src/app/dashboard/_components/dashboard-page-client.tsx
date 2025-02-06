"use client";

import { Card } from "@/components/ui/card";
import { api, type RouterOutputs } from "@/trpc/react";
import { PageHeader } from "./page-header";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, ListChecks, User } from "lucide-react";
import { Step } from "./step";
import { catalogSteps, profileSteps } from "./steps-data";
import {
  ImagesCard,
  ListingDetailsCard,
  TotalListingsCard,
  TotalListsCard,
  ProMembershipCard,
} from "./stats-card";
import { H2, H3, P, List, Muted } from "@/components/typography";

interface DashboardPageClientProps {
  initialStats: RouterOutputs["dashboard"]["getStats"];
}

export function DashboardPageClient({
  initialStats,
}: DashboardPageClientProps) {
  const {
    data: stats,
    isLoading,
    error,
  } = api.dashboard.getStats.useQuery(undefined, {
    initialData: initialStats,
    refetchInterval: 30000,
  });

  return (
    <>
      <PageHeader
        heading="Dashboard"
        text="Welcome to your daylily catalog dashboard"
      />
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-[100px] animate-pulse bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Failed to load dashboard stats
          </div>
        ) : (
          <>
            {stats.profileStats.completionPercentage < 100 && (
              <Card className="mb-4 overflow-hidden">
                <div className="border-b border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <H2 className="pb-2 text-3xl">Complete Your Profile</H2>
                      <P className="text-base text-muted-foreground">
                        Follow these steps to create a professional profile that
                        will help you sell more daylilies.
                      </P>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {stats.profileStats.completionPercentage.toFixed(0)}%
                      </div>
                      <Muted className="text-sm">Profile Completion</Muted>
                    </div>
                  </div>
                  <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <Progress
                      value={stats.profileStats.completionPercentage}
                      className="h-full bg-gradient-to-r transition-all duration-500"
                    />
                  </div>
                </div>
                <div className="bg-card/50 p-6">
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="flex-1">
                      {profileSteps.map((step, i) => (
                        <Step
                          key={step.id}
                          completed={
                            !stats.profileStats.missingFields.includes(step.id)
                          }
                          label={step.label}
                          description={step.description}
                          icon={step.icon}
                          isLast={i === profileSteps.length - 1}
                        />
                      ))}
                    </div>

                    <div className="flex flex-1 flex-col gap-6 rounded-lg">
                      <div className="flex flex-col gap-4">
                        <H3 className="text-2xl">Why complete your profile?</H3>
                        <P className="text-sm leading-7 text-muted-foreground">
                          Complete your profile to unlock all features and help
                          customers find your business.
                        </P>
                        <List>
                          <li>Help customers find and trust your business</li>
                          <li>Showcase your expertise in daylily growing</li>
                          <li>Improve your visibility in search results</li>
                          <li>Stand out from other sellers</li>
                        </List>
                      </div>
                      <Button size="lg" asChild>
                        <Link href="/dashboard/profile">
                          <User className="mr-2 h-4 w-4" />
                          Complete Your Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {(catalogSteps.filter((step) => step.isComplete(stats)).length /
              catalogSteps.length) *
              100 <
              100 && (
              <Card className="mb-4 overflow-hidden">
                <div className="border-b border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <H2 className="border-b-0">Build Your Catalog</H2>
                      <P className="text-muted-foreground">
                        Follow these steps to create your daylily catalog and
                        start selling.
                      </P>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {(
                          (catalogSteps.filter((step) => step.isComplete(stats))
                            .length /
                            catalogSteps.length) *
                          100
                        ).toFixed(0)}
                        %
                      </div>
                      <Muted className="text-sm">Catalog Progress</Muted>
                    </div>
                  </div>
                  <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <Progress
                      value={
                        (catalogSteps.filter((step) => step.isComplete(stats))
                          .length /
                          catalogSteps.length) *
                        100
                      }
                      className="h-full bg-gradient-to-r transition-all duration-500"
                    />
                  </div>
                </div>
                <div className="bg-card/50 p-6">
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="flex-1">
                      {catalogSteps.map((step, i) => (
                        <Step
                          key={step.id}
                          completed={step.isComplete(stats)}
                          label={step.label}
                          description={step.description}
                          icon={step.icon}
                          isLast={i === catalogSteps.length - 1}
                        />
                      ))}
                    </div>

                    <div className="flex flex-1 flex-col gap-6 rounded-lg">
                      <div>
                        <H3>Why build your catalog?</H3>
                        <P className="text-muted-foreground">
                          A complete catalog helps you organize and sell your
                          daylilies effectively.
                        </P>
                        <List>
                          <li>Showcase your daylily collection</li>
                          <li>Organize listings into themed lists</li>
                          <li>Add beautiful photos of your flowers</li>
                          <li>Connect with the daylily database</li>
                        </List>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="lg" asChild>
                          <Link href="/dashboard/listings">
                            <Package className="mr-2 h-4 w-4" />
                            Manage Listings
                          </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                          <Link href="/dashboard/lists">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Manage Lists
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <ProMembershipCard />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <TotalListingsCard stats={stats} />
              <TotalListsCard stats={stats} />
              <ImagesCard stats={stats} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ListingDetailsCard stats={stats} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
