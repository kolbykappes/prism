"use client";

import { useState, useEffect } from "react";
import { usePolling } from "@/hooks/use-polling";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ProcessingJob {
  id: string;
  sourceFileId: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  filename: string | null;
  fileType: string | null;
  fileSize: number | null;
  summaryStatus: string | null;
  summaryError: string | null;
  llmModel: string | null;
  tokenCount: number | null;
  truncated: boolean | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "queued":
      return <Badge variant="secondary">Queued</Badge>;
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "complete":
      return <Badge className="bg-green-100 text-green-700">Complete</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function elapsed(start: string | null, end: string | null) {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const secs = Math.round((e - s) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function formatSize(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProcessingIndicator({
  activeCount,
  projectId,
}: {
  activeCount: number;
  projectId: string;
}) {
  usePolling(activeCount > 0);

  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchJobs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/processing-status`);
        if (res.ok && !cancelled) {
          setJobs(await res.json());
        }
      } catch (error) {
        console.error("[processing-status]", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, projectId]);

  if (activeCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
        <span>
          Processing {activeCount} file{activeCount > 1 ? "s" : ""}...
        </span>
        <span className="ml-auto text-xs text-blue-500">Click for details</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Processing Status</DialogTitle>
          </DialogHeader>

          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No processing jobs found.
            </p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {job.filename ?? "Unknown file"}
                    </span>
                    {statusBadge(job.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div>File type: <span className="text-foreground">{job.fileType ?? "—"}</span></div>
                    <div>File size: <span className="text-foreground">{formatSize(job.fileSize)}</span></div>
                    <div>Created: <span className="text-foreground">{new Date(job.createdAt).toLocaleString()}</span></div>
                    <div>Elapsed: <span className="text-foreground">{elapsed(job.startedAt, job.completedAt)}</span></div>
                    {job.llmModel && (
                      <div>Model: <span className="font-mono text-xs text-foreground">{job.llmModel}</span></div>
                    )}
                    {job.tokenCount !== null && (
                      <div>Tokens: <span className="text-foreground">{job.tokenCount.toLocaleString()}</span></div>
                    )}
                    {job.truncated && (
                      <div className="col-span-2 text-amber-600">Input was truncated to fit token limit</div>
                    )}
                  </div>

                  {(job.errorMessage || job.summaryError) && (
                    <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">
                      <span className="font-medium">Error: </span>
                      {job.errorMessage || job.summaryError}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground/60">
                    Job ID: {job.id} · Source File ID: {job.sourceFileId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
