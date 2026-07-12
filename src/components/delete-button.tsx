"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmMessage = "Are you sure? This cannot be undone.",
  label = "Delete",
  size = "sm",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
  size?: "sm" | "default";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            await action();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete");
          }
        });
      }}
    >
      {isPending ? "Deleting…" : label}
    </Button>
  );
}
