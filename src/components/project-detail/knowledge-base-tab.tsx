"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/layout/empty-state";

interface Summary {
  id: string;
  content: string | null;
  generatedAt: string | null;
  processingStatus: string;
  sourceFile: {
    filename: string;
  };
}

export function KnowledgeBaseTab({ summaries }: { summaries: Summary[] }) {
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
              {summary.sourceFile.filename}
            </h3>
            {summary.generatedAt && (
              <p className="text-sm text-muted-foreground">
                Generated {new Date(summary.generatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <MarkdownRenderer content={summary.content!} />
        </div>
      ))}
    </div>
  );
}
