"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function usePolling(
  hasActiveJobs: boolean,
  intervalMs: number = 3000
) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasActiveJobs) {
      intervalRef.current = setInterval(() => {
        router.refresh();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasActiveJobs, intervalMs, router]);
}
