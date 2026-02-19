"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  id: string;
  tokenCount: number | null;
  processingStatus: string;
}

interface KnowledgeBaseTabProps {
  projectId: string;
  summaries: Summary[];
  compressedKb: string | null;
  compressedKbAt: string | null;
  compressedKbTokenCount: number | null;
}

function CompressDialog({
  open,
  onOpenChange,
  projectId,
  rawTokenCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  rawTokenCount: number;
}) {
  const router = useRouter();
  const [targetTokens, setTargetTokens] = useState("2000");
  const [compressing, setCompressing] = useState(false);

  async function handleCompress() {
    const target = Number(targetTokens);
    if (!target || target < 100) {
      toast.error("Target must be at least 100 tokens");
      return;
    }
    setCompressing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/knowledge-base/compress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTokens: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to start compression");
        return;
      }
      toast.success("Compression started — refresh in a moment to see the result");
      onOpenChange(false);
      setTimeout(() => router.refresh(), 5000);
    } catch {
      toast.error("Failed to start compression");
    } finally {
      setCompressing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Compress Knowledge Base</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current KB is approximately{" "}
            <span className="font-medium text-foreground">
              {rawTokenCount.toLocaleString()} tokens
            </span>{" "}
            across multiple summaries. Compression synthesizes them into a single
            chronologically-ordered document optimized for AI consumption.
          </p>
          <div className="space-y-2">
            <Label htmlFor="target-tokens">Target token length</Label>
            <Input
              id="target-tokens"
              type="number"
              min={100}
              max={50000}
              value={targetTokens}
              onChange={(e) => setTargetTokens(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Claude will aim to compress the KB to approximately this token count.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCompress} disabled={compressing}>
            {compressing ? "Starting…" : "Compress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeBaseTab({
  projectId,
  summaries,
  compressedKb,
  compressedKbAt,
  compressedKbTokenCount,
}: KnowledgeBaseTabProps) {
  const [compressDialogOpen, setCompressDialogOpen] = useState(false);

  const completeSummaries = summaries.filter(
    (s) => s.processingStatus === "complete"
  );

  const rawTokenCount = completeSummaries.reduce(
    (sum, s) => sum + (s.tokenCount ?? 0),
    0
  );

  if (completeSummaries.length === 0) {
    return (
      <EmptyState
        title="No summaries yet"
        description="Upload and process files to build your knowledge base."
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">
            {rawTokenCount > 0
              ? `~${rawTokenCount.toLocaleString()} tokens across ${completeSummaries.length} summar${completeSummaries.length === 1 ? "y" : "ies"}`
              : `${completeSummaries.length} summar${completeSummaries.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => setCompressDialogOpen(true)}>
          <Minimize2 className="mr-2 h-4 w-4" />
          {compressedKb ? "Re-compress" : "Compress"}
        </Button>
      </div>

      {/* Compressed KB content */}
      {compressedKb ? (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant="secondary">Compressed</Badge>
            {compressedKbTokenCount != null && (
              <span className="text-sm text-muted-foreground">
                {compressedKbTokenCount.toLocaleString()} tokens
              </span>
            )}
            {compressedKbAt && (
              <span className="text-sm text-muted-foreground">
                Generated {new Date(compressedKbAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <MarkdownRenderer content={compressedKb} />
        </div>
      ) : (
        <EmptyState
          title="Not yet compressed"
          description="Compress the knowledge base to create a single unified document optimized for use in AI workflows."
        />
      )}

      <CompressDialog
        open={compressDialogOpen}
        onOpenChange={setCompressDialogOpen}
        projectId={projectId}
        rawTokenCount={rawTokenCount}
      />
    </>
  );
}
