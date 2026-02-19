import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TabContainer } from "@/components/project-detail/tab-container";
import { UploadDialog } from "@/components/project-detail/upload-dialog";
import { OtterImportDialog } from "@/components/project-detail/otter-import-dialog";
import { ProcessingIndicator } from "@/components/project-detail/processing-indicator";
import { ProjectOverviewEditor } from "@/components/project-detail/project-overview-editor";
import { EditProjectDialog } from "@/components/project-detail/edit-project-dialog";

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
          sourceFile: { select: { filename: true, uploadedBy: true, uploadedAt: true, contentDate: true, contentDateSource: true } },
        },
      },
      projectPeople: {
        orderBy: { addedAt: "desc" },
        include: { person: true },
      },
      company: { select: { id: true, name: true, markdownContent: true } },
      businessUnit: { select: { id: true, name: true, markdownContent: true } },
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
    errorMessage: s.errorMessage ?? null,
    tokenCount: s.tokenCount,
    truncated: s.truncated,
    sourceFile: {
      filename: s.sourceFile.filename,
      uploadedBy: s.sourceFile.uploadedBy,
      uploadedAt: s.sourceFile.uploadedAt.toISOString(),
      contentDate: s.sourceFile.contentDate?.toISOString() ?? null,
      contentDateSource: s.sourceFile.contentDateSource ?? null,
    },
  }));

  const files = project.sourceFiles.map((f) => ({
    id: f.id,
    filename: f.filename,
    fileType: f.fileType,
    fileSize: f.fileSize,
    blobUrl: f.blobUrl,
    uploadedAt: f.uploadedAt.toISOString(),
    uploadedBy: f.uploadedBy,
    contentDate: f.contentDate?.toISOString() ?? null,
    contentDateSource: f.contentDateSource ?? null,
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
      <div className="mb-1">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; All Projects
        </Link>
      </div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <EditProjectDialog
              projectId={id}
              name={project.name}
              description={project.description ?? null}
              projectType={project.projectType}
              companyId={project.companyId ?? null}
              businessUnitId={project.businessUnitId ?? null}
            />
          </div>
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
        projectId={id}
      />

      <TabContainer
        summaries={summaries}
        files={files}
        projectId={id}
        people={people}
        compressedKb={project.compressedKb ?? null}
        compressedKbAt={project.compressedKbAt?.toISOString() ?? null}
        compressedKbTokenCount={project.compressedKbTokenCount ?? null}
        company={project.company ? { name: project.company.name, markdownContent: project.company.markdownContent } : null}
        businessUnit={project.businessUnit ? { name: project.businessUnit.name, markdownContent: project.businessUnit.markdownContent } : null}
      />
    </div>
  );
}
