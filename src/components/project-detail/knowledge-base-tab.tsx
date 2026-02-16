"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/layout/empty-state";

interface Summary {
  id: string;
  sourceFileId: string;
  content: string | null;
  generatedAt: string | null;
  processingStatus: string;
  sourceFile: {
    filename: string;
    uploadedBy?: string;
  };
}

export function KnowledgeBaseTab({
  summaries,
  onClickFilename,
}: {
  summaries: Summary[];
  onClickFilename?: (sourceFileId: string) => void;
}) {
  const completeSummaries = summaries.filter(
    (s) => s.processingStatus === "complete" && s.content
  );

  if (completeSummaries.length === 0) {
    return (
      <EmptyState
        title="No summaries yet"
        description="Upload files to generate summaries for your knowledge base."
      />
    );
  }

  return (
    <div className="space-y-6">
      {completeSummaries.map((summary, i) => (
        <div key={summary.id}>
          {i > 0 && <Separator className="mb-6" />}
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {onClickFilename ? (
                <button
                  className="hover:underline text-primary text-left"
                  onClick={() => onClickFilename(summary.sourceFileId)}
                >
                  {summary.sourceFile.filename}
                </button>
              ) : (
                summary.sourceFile.filename
              )}
            </h3>
            <div className="flex gap-3 text-sm text-muted-foreground">
              {summary.sourceFile.uploadedBy && (
                <span>Uploaded by {summary.sourceFile.uploadedBy}</span>
              )}
              {summary.generatedAt && (
                <span>
                  Generated {new Date(summary.generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <MarkdownRenderer content={summary.content!} />
        </div>
      ))}
    </div>
  );
}
