"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeBaseTab } from "./knowledge-base-tab";
import { SummariesTab } from "./summaries-tab";
import { SourceFilesTab } from "./source-files-tab";
import { PeopleTab } from "./people-tab";

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

interface SourceFile {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  contentDate: string | null;
  contentDateSource: string | null;
}

interface ProjectPerson {
  id: string;
  role: string | null;
  notes: string | null;
  autoExtracted: boolean;
  addedAt: string;
  person: {
    id: string;
    name: string;
    email: string | null;
    organization: string | null;
    role: string | null;
  };
}

export function TabContainer({
  summaries,
  files,
  projectId,
  people,
  compressedKb,
  compressedKbAt,
  compressedKbTokenCount,
}: {
  summaries: Summary[];
  files: SourceFile[];
  projectId: string;
  people: ProjectPerson[];
  compressedKb: string | null;
  compressedKbAt: string | null;
  compressedKbTokenCount: number | null;
}) {
  const [activeTab, setActiveTab] = useState("knowledge-base");

  function handleViewSummary(fileId: string) {
    const summary = summaries.find((s) => s.sourceFileId === fileId);
    if (summary) {
      setActiveTab("summaries");
    }
  }

  function handleClickFilename(_sourceFileId: string) {
    setActiveTab("source-files");
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
        <TabsTrigger value="summaries">Summaries</TabsTrigger>
        <TabsTrigger value="source-files">Source Files</TabsTrigger>
        <TabsTrigger value="people">People</TabsTrigger>
      </TabsList>
      <TabsContent value="knowledge-base" className="mt-2">
        <KnowledgeBaseTab
          projectId={projectId}
          summaries={summaries}
          compressedKb={compressedKb}
          compressedKbAt={compressedKbAt}
          compressedKbTokenCount={compressedKbTokenCount}
        />
      </TabsContent>
      <TabsContent value="summaries" className="mt-2">
        <SummariesTab
          summaries={summaries}
          projectId={projectId}
          onClickFilename={handleClickFilename}
        />
      </TabsContent>
      <TabsContent value="source-files" className="mt-2">
        <SourceFilesTab
          files={files}
          projectId={projectId}
          onViewSummary={handleViewSummary}
        />
      </TabsContent>
      <TabsContent value="people" className="mt-2">
        <PeopleTab people={people} projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
