"use client";

import { MixerHorizontalIcon, ResetIcon } from "@radix-ui/react-icons";
import { type Table } from "@tanstack/react-table";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

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
      <div className="flex w-full rounded-md">
        <div className="flex w-full items-center">
          <div
            className="px-2"
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
          >
            <DragHandleDots2Icon className="h-4 w-4 cursor-grab" />
          </div>
          {children}
        </div>
      </div>
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
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Get columns that can't be hidden
  const unhideableColumnIds = table
    .getAllColumns()
    .filter((column) => !column.getCanHide())
    .map((column) => column.id);

  // Get pinned column IDs from meta
  const leftPinnedColumns = table.options.meta?.pinnedColumns?.left ?? [];
  const rightPinnedColumns = table.options.meta?.pinnedColumns?.right ?? [];
  const pinnedColumnIds = [...leftPinnedColumns, ...rightPinnedColumns];

  // Get hideable columns for the reorderable list, excluding pinned columns
  const hideableColumns = table
    .getAllColumns()
    .filter(
      (column) => column.getCanHide() && !pinnedColumnIds.includes(column.id),
    );

  // Current order of hideable columns
  const items = table.getState().columnOrder?.length
    ? table
        .getState()
        .columnOrder.filter(
          (id) =>
            !unhideableColumnIds.includes(id) && !pinnedColumnIds.includes(id),
        )
    : hideableColumns.map((column) => column.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Set new order maintaining pinned columns
        table.setColumnOrder([
          ...leftPinnedColumns,
          ...newOrder,
          ...rightPinnedColumns,
        ]);
      }
    }
  }

  function resetTable() {
    // Show all hideable columns
    table.setColumnVisibility(
      hideableColumns.reduce(
        (acc, column) => ({ ...acc, [column.id]: true }),
        {},
      ),
    );
    table.setColumnOrder([]);
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto flex h-8">
            <MixerHorizontalIcon className="mr-2 h-4 w-4" />
            Table Options
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Customize Columns</SheetTitle>
            <SheetDescription>
              Show, hide, or reorder columns using drag and drop
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100vh-4rem)] flex-col space-y-6 pt-6">
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full justify-start px-2"
              onClick={(e) => {
                e.preventDefault();
                setShowResetConfirm(true);
              }}
            >
              <ResetIcon className="mr-2 h-4 w-4" />
              Reset to default
            </Button>

            <Separator />

            <ScrollArea className="flex-1">
              <div className="space-y-3">
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
                          className="relative select-none"
                        >
                          <div className="flex flex-1 items-center space-x-3">
                            <Checkbox
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) => {
                                column.toggleVisibility(!!value);
                              }}
                            />
                            <label className="flex-1 cursor-pointer">
                              {table.options.meta?.getColumnLabel?.(
                                column.id,
                              ) ?? column.id}
                            </label>
                          </div>
                        </SortableItem>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
