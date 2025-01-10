"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export function CreateListButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");

  const router = useRouter();
  const createList = api.list.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      // Reset form
      setName("");
      setIntro("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createList.mutate({
      name,
      intro,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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

          <Button type="submit" disabled={createList.isPending}>
            {createList.isPending ? "Creating..." : "Create List"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
