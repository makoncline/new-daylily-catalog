"use client";

import { type List } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";

interface ListsTableProps {
  initialLists: Array<
    List & {
      _count: {
        listings: number;
      };
    }
  >;
}

export function ListsTable({ initialLists }: ListsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={initialLists}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        pagination: {
          pageSize: 10,
          pageIndex: 0,
        },
      }}
    />
  );
}
