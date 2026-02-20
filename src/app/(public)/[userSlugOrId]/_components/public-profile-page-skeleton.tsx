import { MainContent } from "@/app/(public)/_components/main-content";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileHeaderSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
      <div className="order-1 sm:order-2 sm:col-span-7 space-y-2">
        <Skeleton className="h-5 w-1/6" />
        <Skeleton className="h-10 w-5/6" />
        <Skeleton className="h-5 w-2/6" />
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="order-2 sm:col-span-12 sm:hidden">
        <Skeleton className="h-7 w-full" />
      </div>

      <div className="order-3 sm:order-1 sm:col-span-5">
        <Skeleton className="aspect-square w-full" />
      </div>
    </div>
  );
}

function ListsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-24" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

export function PublicProfilePageSkeleton() {
  return (
    <MainContent>
      <div className="mb-6">
        <Skeleton className="h-6 w-64" />
      </div>

      <div className="space-y-6">
        <ProfileHeaderSkeleton />
        <ListsSkeleton />
        <ListingsSkeleton />
      </div>
    </MainContent>
  );
}
