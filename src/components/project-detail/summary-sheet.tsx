"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Badge } from "@/components/ui/badge";

interface SummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  content: string | null;
  generatedAt: string | null;
  tokenCount: number | null;
  truncated: boolean;
}

export function SummarySheet({
  open,
  onOpenChange,
  filename,
  content,
  generatedAt,
  tokenCount,
  truncated,
}: SummarySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="pr-8">{filename}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {generatedAt && (
                <span>Generated {new Date(generatedAt).toLocaleDateString()}</span>
              )}
              {tokenCount != null && (
                <span>{tokenCount.toLocaleString()} tokens</span>
              )}
              {truncated && <Badge variant="outline">Truncated</Badge>}
            </div>
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="text-muted-foreground text-sm">No summary content available.</p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
