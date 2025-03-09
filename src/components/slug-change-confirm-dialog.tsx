import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { P, Muted, InlineCode } from "@/components/typography";

interface SlugChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  oldSlug: string;
  newSlug: string;
  baseUrl: string;
}

export function SlugChangeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  oldSlug,
  newSlug,
  baseUrl,
}: SlugChangeConfirmDialogProps) {
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, "");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm URL Change</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <P>
            Changing your profile URL will make any existing links to your
            profile stop working, including links from search engine results.
          </P>
          <div className="rounded-md bg-muted p-3">
            <Muted className="flex flex-col space-y-2">
              <div>
                <span className="font-medium">Current URL: </span>
                <InlineCode>
                  {cleanBaseUrl}/{oldSlug}
                </InlineCode>
              </div>
              <div>
                <span className="font-medium">New URL: </span>
                <InlineCode>
                  {cleanBaseUrl}/{newSlug}
                </InlineCode>
              </div>
            </Muted>
          </div>
          <P>Are you sure you want to change your profile URL?</P>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild onClick={onCancel}>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <Button onClick={onConfirm} variant="destructive">
            Change URL
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
