"use client";

import { Card } from "@/components/ui/card";
import { api, type RouterOutputs } from "@/trpc/react";
import { PageHeader } from "./page-header";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Image as ImageIcon,
  ListChecks,
  Package,
  Plus,
  User,
  MapPin,
  FileText,
  Image,
  Check,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardPageClientProps {
  initialStats: RouterOutputs["dashboard"]["getStats"];
}

const steps = [
  {
    id: "hasProfileImage",
    label: "Add first profile image",
    description: "Upload a profile image to represent your business",
    icon: Image,
  },
  {
    id: "intro",
    label: "Add your intro",
    description: "Write a short introduction about your daylily business",
    icon: FileText,
  },
  {
    id: "userLocation",
    label: "Add your location",
    description: "Help local customers find you",
    icon: MapPin,
  },
  {
    id: "bio",
    label: "Add your bio",
    description: "Share your story and expertise with daylilies",
    icon: FileText,
  },
] as const;

function ProfileStep({
  completed,
  label,
  description,
  icon: Icon,
  isLast,
}: {
  completed: boolean;
  label: string;
  description: string;
  icon: React.ElementType;
  isLast?: boolean;
}) {
  return (
    <div className={cn("relative flex gap-4", !isLast && "pb-6")}>
      {!isLast && (
        <div
          className={cn(
            "absolute left-[17px] top-[30px] h-[calc(100%-20px)] w-[2px]",
            completed ? "bg-green-600" : "bg-border",
          )}
        />
      )}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
          completed
            ? "border-green-600 bg-green-600 text-white"
            : "border-border bg-background",
        )}
      >
        {completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "scroll-m-20 text-lg font-semibold tracking-tight",
            completed ? "text-green-600" : "text-foreground",
          )}
        >
          {label}
        </span>
        <span className="text-sm leading-7 text-muted-foreground">
          {description}
        </span>
      </div>
    </div>
  );
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
          <Card className="mb-4 overflow-hidden">
            <div className="border-b border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
                    Complete Your Profile
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Follow these steps to create a professional profile that
                    will help you sell more daylilies.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {stats.profileStats.completionPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Profile Completion
                  </div>
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
                <div className="">
                  {steps.map((step, i) => (
                    <ProfileStep
                      key={step.id}
                      completed={
                        !stats.profileStats.missingFields.includes(step.id)
                      }
                      label={step.label}
                      description={step.description}
                      icon={step.icon}
                      isLast={i === steps.length - 1}
                    />
                  ))}
                </div>

                {stats.profileStats.missingFields.length > 0 && (
                  <div className="flex flex-col gap-6 rounded-lg">
                    <div className="flex flex-col gap-4">
                      <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Why complete your profile?
                      </h3>
                      <p className="text-sm leading-7 text-muted-foreground">
                        Complete your profile to unlock all features and help
                        customers find your business.
                      </p>
                      <ul className="ml-6 list-disc [&>li]:mt-2">
                        <li>Help customers find and trust your business</li>
                        <li>Showcase your expertise in daylily growing</li>
                        <li>Improve your visibility in search results</li>
                        <li>Stand out from other sellers</li>
                      </ul>
                    </div>
                    <Button size="lg" asChild>
                      <Link href="/dashboard/profile">
                        Complete Your Profile
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Total Listings</h3>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {stats.totalListings}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                ${stats.listingStats.averagePrice.toFixed(2)} average price
              </div>
              {stats.totalListings === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  asChild
                >
                  <Link href="/dashboard/listings/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Listing
                  </Link>
                </Button>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Total Lists</h3>
              </div>
              <div className="mt-2 text-2xl font-bold">{stats.totalLists}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {stats.listStats.averageListingsPerList.toFixed(1)} listings per
                list
              </div>
              {stats.totalLists === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  asChild
                >
                  <Link href="/dashboard/lists/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First List
                  </Link>
                </Button>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Images</h3>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {stats.imageStats.total}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {stats.listingStats.withImages} listings with images
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-medium">Listing Details</h3>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With AHS Data</span>
                  <span>{stats.listingStats.withAhsData}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With Images</span>
                  <span>{stats.listingStats.withImages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Without Images</span>
                  <span>
                    {stats.totalListings - stats.listingStats.withImages}
                  </span>
                </div>
              </div>
              {stats.totalListings > 0 &&
                stats.listingStats.withImages < stats.totalListings && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    asChild
                  >
                    <Link href="/dashboard/listings">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Add Missing Images
                    </Link>
                  </Button>
                )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
