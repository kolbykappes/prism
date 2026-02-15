"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

interface Summary {
  id: string;
  sourceFileId: string;
  content: string | null;
  generatedAt: string | null;
  processingStatus: string;
  tokenCount: number | null;
  truncated: boolean;
  sourceFile: {
    filename: string;
  };
}

export function SummariesTab({
  summaries,
  projectId,
}: {
  summaries: Summary[];
  projectId: string;
}) {
  const router = useRouter();

  async function handleReprocess(sourceFileId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${sourceFileId}/reprocess`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to reprocess");
        return;
      }
      toast.success("Re-processing started");
      router.refresh();
    } catch {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source File</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Generated</TableHead>
          <TableHead>Tokens</TableHead>
          <TableHead>Truncated</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.map((summary) => (
          <TableRow key={summary.id}>
            <TableCell className="font-medium">
              {summary.sourceFile.filename}
            </TableCell>
            <TableCell>
              <StatusBadge status={summary.processingStatus} />
            </TableCell>
            <TableCell>
              {summary.generatedAt
                ? new Date(summary.generatedAt).toLocaleDateString()
                : "-"}
            </TableCell>
            <TableCell>
              {summary.tokenCount?.toLocaleString() ?? "-"}
            </TableCell>
            <TableCell>{summary.truncated ? "Yes" : "No"}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReprocess(summary.sourceFileId)}
                disabled={summary.processingStatus === "processing"}
              >
                Re-process
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
