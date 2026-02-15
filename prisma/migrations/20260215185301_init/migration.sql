-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('txt', 'vtt', 'srt', 'pdf', 'md');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('queued', 'processing', 'complete', 'failed');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,
    "google_doc_id" TEXT,
    "google_doc_url" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_size" INTEGER NOT NULL,
    "blob_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markdown_summaries" (
    "id" UUID NOT NULL,
    "source_file_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "blob_url" TEXT,
    "content" TEXT,
    "generated_at" TIMESTAMP(3),
    "llm_model" TEXT,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "token_count" INTEGER,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "verbosity_level" TEXT,
    "summary_style" TEXT,

    CONSTRAINT "markdown_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" UUID NOT NULL,
    "source_file_id" UUID NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'queued',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "markdown_summaries_source_file_id_key" ON "markdown_summaries"("source_file_id");

-- AddForeignKey
ALTER TABLE "source_files" ADD CONSTRAINT "source_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markdown_summaries" ADD CONSTRAINT "markdown_summaries_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markdown_summaries" ADD CONSTRAINT "markdown_summaries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
