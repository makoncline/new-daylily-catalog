"use client";

import { useState } from "react";
import { type List } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Pencil, Trash, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { P } from "@/components/typography";
import { normalizeError } from "@/lib/error-utils";

interface ListActionsProps {
  list: List & {
    _count: {
      listings: number;
    };
  };
}

export function ListActions({ list }: ListActionsProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState(list.title);
  const [intro, setIntro] = useState(list.description ?? "");

  const router = useRouter();
  const { toast } = useToast();

  const updateList = api.list.update.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      router.refresh();
      toast({
        title: "List deleted",
        description: "Your list has been deleted successfully.",
      });
    },
    onError: (error, errorInfo) => {
      toast({
        variant: "destructive",
        title: "Error deleting list",
        description: error.message,
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListActions", errorInfo },
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateList.mutate({
      id: list.id,
      data: {
        title: name,
        description: intro,
      },
    });
  };

  const handleDelete = () => {
    deleteList.mutate({ id: list.id });
  };

  const hasListings = list._count.listings > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intro">Description</Label>
              <Textarea
                id="intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Add a description for your list..."
              />
            </div>

            <Button type="submit" disabled={updateList.isPending}>
              {updateList.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <P className="text-sm text-muted-foreground">
              {hasListings ? (
                <>
                  This list cannot be deleted because it has{" "}
                  {list._count.listings} listing
                  {list._count.listings === 1 ? "" : "s"} associated with it.
                  Remove all listings first.
                </>
              ) : (
                "Are you sure you want to delete this list? This action cannot be undone."
              )}
            </P>
          </DialogHeader>

          {hasListings && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Remove all listings from this list before deleting it.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {hasListings ? "Close" : "Cancel"}
            </Button>
            {!hasListings && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteList.isPending}
              >
                {deleteList.isPending ? "Deleting..." : "Delete List"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
