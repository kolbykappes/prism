-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('uploaded', 'reprocessed', 'deleted', 'summary_completed', 'project_created');

-- AlterTable
ALTER TABLE "markdown_summaries" ADD COLUMN     "prompt_template_id" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "overview" TEXT;

-- AlterTable
ALTER TABLE "source_files" ADD COLUMN     "uploaded_by" TEXT NOT NULL DEFAULT 'Kolby';

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "source_file_id" UUID,
    "user_name" TEXT NOT NULL DEFAULT 'Kolby',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
