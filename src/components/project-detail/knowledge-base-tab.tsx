"use client";

import { useState, useEffect, useRef } from "react";
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
import { Minimize2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  id: string;
  tokenCount: number | null;
  processingStatus: string;
  content: string | null;
  generatedAt: string | null;
  sourceFile: {
    filename: string;
    contentDate: string | null;
  };
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
  onCompressStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  rawTokenCount: number;
  onCompressStarted: () => void;
}) {
  const [targetTokens, setTargetTokens] = useState("10000");
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
      onOpenChange(false);
      onCompressStarted();
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
  const router = useRouter();
  const [compressDialogOpen, setCompressDialogOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const baselineKbAt = useRef<string | null>(null);

  // Poll every 5s while compressing; stop when compressedKbAt changes
  useEffect(() => {
    if (!isCompressing) return;

    if (compressedKbAt !== baselineKbAt.current) {
      setIsCompressing(false);
      toast.success("Knowledge base compressed successfully!");
      return;
    }

    const timer = setTimeout(() => router.refresh(), 5000);
    return () => clearTimeout(timer);
  }, [isCompressing, compressedKbAt, router]);

  function handleCompressStarted() {
    baselineKbAt.current = compressedKbAt;
    setIsCompressing(true);
    toast.info("Compressing knowledge base — this takes 20–40 seconds…");
  }

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
        <Button
          variant="outline"
          onClick={() => setCompressDialogOpen(true)}
          disabled={isCompressing}
        >
          {isCompressing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Compressing…
            </>
          ) : (
            <>
              <Minimize2 className="mr-2 h-4 w-4" />
              {compressedKb ? "Re-compress" : "Compress"}
            </>
          )}
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
        <div className="space-y-0">
          {[...completeSummaries]
            .sort((a, b) => {
              const aDate = a.sourceFile.contentDate ?? a.generatedAt ?? "";
              const bDate = b.sourceFile.contentDate ?? b.generatedAt ?? "";
              return bDate.localeCompare(aDate);
            })
            .map((summary, i) => (
              <div key={summary.id}>
                <div className="mb-3">
                  <h3 className="text-base font-semibold">{summary.sourceFile.filename}</h3>
                  {summary.generatedAt && (
                    <p className="text-xs text-muted-foreground">
                      {summary.sourceFile.contentDate
                        ? new Date(summary.sourceFile.contentDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : new Date(summary.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                {summary.content && <MarkdownRenderer content={summary.content} />}
                {i < completeSummaries.length - 1 && <hr className="my-6 border-border" />}
              </div>
            ))}
        </div>
      )}

      <CompressDialog
        open={compressDialogOpen}
        onOpenChange={setCompressDialogOpen}
        projectId={projectId}
        rawTokenCount={rawTokenCount}
        onCompressStarted={handleCompressStarted}
      />
    </>
  );
}
