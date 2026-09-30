"use client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
export function ListFormSkeleton() {
  return (
    <Card role="status" aria-label="Loading list details">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent>
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
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-9 w-32" />
      </CardFooter>
    </Card>
  );
}
