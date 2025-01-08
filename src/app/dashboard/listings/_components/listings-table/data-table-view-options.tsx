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

  // Get columns that can't be hidden (except actions which is always last)
  const unhideableColumnIds = table
    .getAllColumns()
    .filter((column) => !column.getCanHide() && column.id !== "actions")
    .map((column) => column.id);

  // Get hideable columns for the reorderable list
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  // Current order of hideable columns
  const items = table.getState().columnOrder.length
    ? table
        .getState()
        .columnOrder.filter((id) => !unhideableColumnIds.includes(id))
    : hideableColumns.map((column) => column.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(items, oldIndex, newIndex);
        table.setColumnOrder([...unhideableColumnIds, ...newOrder]);
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto flex h-8">
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
