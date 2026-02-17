import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TabContainer } from "@/components/project-detail/tab-container";
import { UploadDialog } from "@/components/project-detail/upload-dialog";
import { OtterImportDialog } from "@/components/project-detail/otter-import-dialog";
import { ProcessingIndicator } from "@/components/project-detail/processing-indicator";
import { ProjectOverviewEditor } from "@/components/project-detail/project-overview-editor";

export const revalidate = 15; // seconds — cache page, revalidate in background

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sourceFiles: {
        orderBy: { uploadedAt: "desc" },
      },
      markdownSummaries: {
        orderBy: { generatedAt: "desc" },
        include: {
          sourceFile: { select: { filename: true, uploadedBy: true } },
        },
      },
      projectPeople: {
        orderBy: { addedAt: "desc" },
        include: { person: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const summaries = project.markdownSummaries.map((s) => ({
    id: s.id,
    sourceFileId: s.sourceFileId,
    content: s.content,
    generatedAt: s.generatedAt?.toISOString() ?? null,
    processingStatus: s.processingStatus,
    tokenCount: s.tokenCount,
    truncated: s.truncated,
    sourceFile: s.sourceFile,
  }));

  const files = project.sourceFiles.map((f) => ({
    id: f.id,
    filename: f.filename,
    fileType: f.fileType,
    fileSize: f.fileSize,
    blobUrl: f.blobUrl,
    uploadedAt: f.uploadedAt.toISOString(),
    uploadedBy: f.uploadedBy,
  }));

  const people = project.projectPeople.map((pp) => ({
    id: pp.id,
    role: pp.role,
    notes: pp.notes,
    autoExtracted: pp.autoExtracted,
    addedAt: pp.addedAt.toISOString(),
    person: {
      id: pp.person.id,
      name: pp.person.name,
      email: pp.person.email,
      organization: pp.person.organization,
      role: pp.person.role,
    },
  }));

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; All Projects
        </Link>
      </div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated {project.updatedAt.toLocaleDateString()}
            {" · "}
            <Link
              href={`/projects/${id}/activity`}
              className="hover:underline"
            >
              Activity Log
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <OtterImportDialog projectId={id} />
          <UploadDialog projectId={id} />
        </div>
      </div>

      <ProjectOverviewEditor
        projectId={id}
        initialOverview={project.overview ?? null}
      />

      <ProcessingIndicator
        activeCount={
          summaries.filter(
            (s) =>
              s.processingStatus === "queued" ||
              s.processingStatus === "processing"
          ).length
        }
      />

      <TabContainer
        summaries={summaries}
        files={files}
        projectId={id}
        people={people}
      />
    </div>
  );
}
