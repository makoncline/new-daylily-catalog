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
  currentSlug: string;
  baseUrl: string;
}

export function SlugChangeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  currentSlug,
  baseUrl,
}: SlugChangeConfirmDialogProps) {
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, "");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Before You Edit Your URL</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <P>
            Changing your profile URL can break existing links to your profile,
            including links shared previously or indexed by search engines.
          </P>
          <div className="rounded-md bg-muted p-3">
            <Muted className="flex flex-col space-y-2">
              <div>
                <span className="font-medium">Current URL: </span>
                <InlineCode>
                  {cleanBaseUrl}/{currentSlug}
                </InlineCode>
              </div>
            </Muted>
          </div>
          <P>Do you want to unlock URL editing?</P>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild onClick={onCancel}>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <Button onClick={onConfirm}>
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
