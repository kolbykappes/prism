"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeBaseTab } from "./knowledge-base-tab";
import { SummariesTab } from "./summaries-tab";
import { SourceFilesTab } from "./source-files-tab";

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

interface SourceFile {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
  uploadedAt: string;
}

export function TabContainer({
  summaries,
  files,
  projectId,
}: {
  summaries: Summary[];
  files: SourceFile[];
  projectId: string;
}) {
  return (
    <Tabs defaultValue="knowledge-base">
      <TabsList>
        <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
        <TabsTrigger value="summaries">Summaries</TabsTrigger>
        <TabsTrigger value="source-files">Source Files</TabsTrigger>
      </TabsList>
      <TabsContent value="knowledge-base" className="mt-4">
        <KnowledgeBaseTab summaries={summaries} />
      </TabsContent>
      <TabsContent value="summaries" className="mt-4">
        <SummariesTab summaries={summaries} projectId={projectId} />
      </TabsContent>
      <TabsContent value="source-files" className="mt-4">
        <SourceFilesTab files={files} projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
