"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, RotateCw, Trash2, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";
import { toast } from "sonner";

interface SourceFile {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SourceFilesTab({
  files,
  projectId,
  onViewSummary,
}: {
  files: SourceFile[];
  projectId: string;
  onViewSummary?: (fileId: string) => void;
}) {
  const router = useRouter();

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file and its summary?")) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[file-delete]", data);
        toast.error(data.detail || data.error || "Failed to delete file");
        return;
      }
      toast.success("File deleted");
      router.refresh();
    } catch (error) {
      console.error("[file-delete]", error);
      toast.error("Failed to delete file");
    }
  }

  async function handleReprocess(fileId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${fileId}/reprocess`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[file-reprocess]", data);
        toast.error(data.detail || data.error || "Failed to reprocess");
        return;
      }
      toast.success("Re-processing started");
      router.refresh();
    } catch (error) {
      console.error("[file-reprocess]", error);
      toast.error("Failed to reprocess");
    }
  }

  if (files.length === 0) {
    return (
      <EmptyState
        title="No files"
        description="Upload files to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="hidden md:table-cell">Uploaded By</TableHead>
            <TableHead className="hidden md:table-cell">Uploaded</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">{file.filename}</TableCell>
              <TableCell className="hidden sm:table-cell uppercase">{file.fileType}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatFileSize(file.fileSize)}</TableCell>
              <TableCell className="hidden md:table-cell">{file.uploadedBy}</TableCell>
              <TableCell className="hidden md:table-cell">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  {onViewSummary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSummary(file.id)}
                    >
                      <FileText />
                      <span className="hidden lg:inline">View Summary</span>
                    </Button>
                  )}
                  <a
                    href={file.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download />
                      <span className="hidden lg:inline">Download</span>
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReprocess(file.id)}
                  >
                    <RotateCw />
                    <span className="hidden lg:inline">Re-process</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 />
                    <span className="hidden lg:inline">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
