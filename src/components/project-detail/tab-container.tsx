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
}: {
  summaries: Summary[];
  files: SourceFile[];
  projectId: string;
  people: ProjectPerson[];
}) {
  const [activeTab, setActiveTab] = useState("knowledge-base");

  function handleViewSummary(fileId: string) {
    // Find if a summary exists for this file
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
      <TabsContent value="knowledge-base" className="mt-4">
        <KnowledgeBaseTab
          summaries={summaries}
          onClickFilename={handleClickFilename}
        />
      </TabsContent>
      <TabsContent value="summaries" className="mt-4">
        <SummariesTab
          summaries={summaries}
          projectId={projectId}
          onClickFilename={handleClickFilename}
        />
      </TabsContent>
      <TabsContent value="source-files" className="mt-4">
        <SourceFilesTab
          files={files}
          projectId={projectId}
          onViewSummary={handleViewSummary}
        />
      </TabsContent>
      <TabsContent value="people" className="mt-4">
        <PeopleTab people={people} projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
