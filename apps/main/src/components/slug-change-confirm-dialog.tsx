import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { InlineCode } from "@/components/typography";

interface SlugChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  currentSlug: string;
  baseUrl: string;
  onCloseAutoFocus?: React.ComponentProps<
    typeof AlertDialogContent
  >["onCloseAutoFocus"];
}

export function SlugChangeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  currentSlug,
  baseUrl,
  onCloseAutoFocus,
}: SlugChangeConfirmDialogProps) {
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, "");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Before You Edit Your URL</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <AlertDialogDescription>
            Changing your profile URL can break existing links to your profile,
            including links shared previously or indexed by search engines.
          </AlertDialogDescription>
          <div className="bg-muted rounded-md p-3">
            <p className="text-muted-foreground text-sm">
              <span className="block">
                <span className="font-medium">Current URL: </span>
                <InlineCode>
                  {cleanBaseUrl}/{currentSlug}
                </InlineCode>
              </span>
            </p>
          </div>
          <p>Do you want to unlock URL editing?</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild onClick={onCancel}>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <Button onClick={onConfirm}>Unlock URL editing</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
