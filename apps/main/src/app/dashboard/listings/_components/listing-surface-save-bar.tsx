import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ListingSurfaceSaveBar({
  isSaving,
  saveDisabled,
  saveLabel,
  title,
  onDiscard,
  onSave,
}: {
  isSaving: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  title: string;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 -mx-4 mb-6 border-b px-4 py-3 shadow-sm backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-medium">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving || saveDisabled}
          >
            {isSaving ? (
              <>
                <Spinner aria-hidden="true" />
                Saving…
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
