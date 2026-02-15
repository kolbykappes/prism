"use client";

import { usePolling } from "@/hooks/use-polling";

export function ProcessingIndicator({ activeCount }: { activeCount: number }) {
  usePolling(activeCount > 0);

  if (activeCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
      <span>
        Processing {activeCount} file{activeCount > 1 ? "s" : ""}...
      </span>
    </div>
  );
}
