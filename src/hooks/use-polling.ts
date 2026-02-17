"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function usePolling(
  hasActiveJobs: boolean,
  intervalMs: number = 5000
) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasActiveJobs) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
        if (elapsed >= MAX_POLL_DURATION_MS) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Do one final refresh so the UI shows whatever state we ended in
          router.refresh();
          return;
        }
        router.refresh();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [hasActiveJobs, intervalMs, router]);
}
