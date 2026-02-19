"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCw, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { SummarySheet } from "./summary-sheet";
import { toast } from "sonner";

interface Summary {
  id: string;
  sourceFileId: string;
  content: string | null;
  generatedAt: string | null;
  processingStatus: string;
  errorMessage: string | null;
  tokenCount: number | null;
  truncated: boolean;
  sourceFile: {
    filename: string;
    uploadedBy?: string;
    contentDate: string | null;
    contentDateSource: string | null;
  };
}

function formatContentDate(date: string | null, source: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function contentDateSourceLabel(source: string | null): string {
  if (source === "extracted") return "extracted";
  if (source === "manual") return "manual";
  return "upload date";
}

export function SummariesTab({
  summaries,
  projectId,
  onClickFilename,
}: {
  summaries: Summary[];
  projectId: string;
  onClickFilename?: (sourceFileId: string) => void;
}) {
  const router = useRouter();
  const [sheetSummary, setSheetSummary] = useState<Summary | null>(null);

  async function handleReprocess(sourceFileId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${sourceFileId}/reprocess`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        console.error("[summary-reprocess]", data);
        toast.error(data.detail || data.error || "Failed to reprocess");
        return;
      }
      toast.success("Re-processing started");
      router.refresh();
    } catch (error) {
      console.error("[summary-reprocess]", error);
      toast.error("Failed to reprocess");
    }
  }

  if (summaries.length === 0) {
    return (
      <EmptyState
        title="No summaries"
        description="Upload files to generate summaries."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Content Date</TableHead>
            <TableHead className="hidden md:table-cell">Tokens</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.id}>
              <TableCell className="font-medium max-w-[200px]">
                <div className="truncate">
                  {onClickFilename ? (
                    <button
                      className="text-left hover:underline text-primary"
                      onClick={() => onClickFilename(summary.sourceFileId)}
                    >
                      {summary.sourceFile.filename}
                    </button>
                  ) : (
                    summary.sourceFile.filename
                  )}
                </div>
                {summary.sourceFile.uploadedBy && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {summary.sourceFile.uploadedBy}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={summary.processingStatus} />
                {summary.processingStatus === "failed" && summary.errorMessage && (
                  <p className="mt-1 text-xs text-destructive font-mono break-all">{summary.errorMessage}</p>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                <div>{formatContentDate(summary.sourceFile.contentDate, summary.sourceFile.contentDateSource)}</div>
                {summary.sourceFile.contentDate && (
                  <div className="text-xs text-muted-foreground">
                    {contentDateSourceLabel(summary.sourceFile.contentDateSource)}
                  </div>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {summary.tokenCount?.toLocaleString() ?? "—"}
                {summary.truncated && (
                  <div className="text-xs text-muted-foreground">truncated</div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {summary.processingStatus === "complete" && summary.content && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSheetSummary(summary)}
                      title="View summary"
                    >
                      <Eye />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReprocess(summary.sourceFileId)}
                    disabled={summary.processingStatus === "processing"}
                    title="Re-process"
                  >
                    <RotateCw />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SummarySheet
        open={sheetSummary !== null}
        onOpenChange={(open) => { if (!open) setSheetSummary(null); }}
        filename={sheetSummary?.sourceFile.filename ?? ""}
        content={sheetSummary?.content ?? null}
        generatedAt={sheetSummary?.generatedAt ?? null}
        tokenCount={sheetSummary?.tokenCount ?? null}
        truncated={sheetSummary?.truncated ?? false}
      />
    </>
  );
}
