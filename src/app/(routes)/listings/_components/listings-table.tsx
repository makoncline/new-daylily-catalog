"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import { type ListingListOutput } from "@/server/api/routers/listing";
import Link from "next/link";

export function ListingsTable({ listings }: { listings: ListingListOutput }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Public Note</TableHead>
            <TableHead>Private Note</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => (
            <TableRow key={listing.id}>
              <TableCell>{listing.name}</TableCell>
              <TableCell>
                {listing.price ? formatPrice(listing.price) : "-"}
              </TableCell>
              <TableCell>{listing.publicNote ?? "-"}</TableCell>
              <TableCell>{listing.privateNote ?? "-"}</TableCell>
              <TableCell>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/listings/${listing.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {listings.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No listings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
