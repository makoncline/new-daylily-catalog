"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { MixerHorizontalIcon, ResetIcon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { COLUMN_NAMES } from "@/config/constants";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useState } from "react";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center", className, isDragging && "opacity-50")}
    >
      <div {...attributes} {...listeners} className="px-2">
        <DragHandleDots2Icon className="h-4 w-4 cursor-grab" />
      </div>
      {children}
    </div>
  );
}

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Get all hideable columns except select
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && column.id !== "select");

  // Get the current column order or default to all columns
  const currentOrder = table.getState().columnOrder;
  const allColumns = hideableColumns.map((column) => column.id);

  // Use the current order if it exists, otherwise use all columns
  const items = currentOrder.length
    ? currentOrder.filter((id) => id !== "select")
    : allColumns;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Make sure to include the select column at the start of the order
        table.setColumnOrder(["select", ...newOrder]);
      }
    }
  }

  function resetTable() {
    // Show all columns
    const newVisibility = hideableColumns.reduce(
      (acc, column) => ({
        ...acc,
        [column.id]: true,
      }),
      { select: true },
    );
    table.setColumnVisibility(newVisibility);

    // Reset column order
    table.setColumnOrder([]);

    // Reset sorting
    table.resetSorting();
  }

  return (
    <>
      <DeleteConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        onConfirm={() => {
          resetTable();
          setShowResetConfirm(false);
        }}
        title="Reset table settings"
        description="This will reset all column visibility, order, and sorting settings to their default values. Are you sure?"
        destructive={false}
        actionLabel="Reset"
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 lg:flex"
          >
            <MixerHorizontalIcon className="mr-2 h-4 w-4" />
            Table Options
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <DropdownMenuLabel className="px-0 font-normal">
                <div className="font-semibold">Customize Columns</div>
                <div className="text-xs text-muted-foreground">
                  Show, hide, or reorder columns
                </div>
              </DropdownMenuLabel>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto flex h-8 w-full justify-start px-2"
                onClick={(e) => {
                  e.preventDefault();
                  setShowResetConfirm(true);
                }}
              >
                <ResetIcon className="mr-2 h-4 w-4" />
                Reset to default
              </Button>
            </div>
            <DropdownMenuSeparator className="-mx-2" />
            <div className="-mx-2 max-h-[400px] overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((columnId) => {
                    const column = table.getColumn(columnId);
                    if (!column) return null;

                    return (
                      <SortableItem
                        key={columnId}
                        id={columnId}
                        className="touch-none"
                      >
                        <DropdownMenuCheckboxItem
                          className="flex-1"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => {
                            column.toggleVisibility(!!value);
                          }}
                          onSelect={(e) => {
                            e.preventDefault();
                          }}
                        >
                          {COLUMN_NAMES[
                            columnId as keyof typeof COLUMN_NAMES
                          ] ?? columnId}
                        </DropdownMenuCheckboxItem>
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
