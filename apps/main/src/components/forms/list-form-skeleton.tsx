"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldGroup } from "@/components/ui/field";
export function ListFormSkeleton() {
  return (
    <div role="status" aria-label="Loading list details" className="space-y-6">
      <FieldGroup>
        <Field>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-48" />
        </Field>
        <Field>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
