"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SourceFilesTab({
  files,
  projectId,
}: {
  files: SourceFile[];
  projectId: string;
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
        toast.error("Failed to delete file");
        return;
      }
      toast.success("File deleted");
      router.refresh();
    } catch {
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
        toast.error("Failed to reprocess");
        return;
      }
      toast.success("Re-processing started");
      router.refresh();
    } catch {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Filename</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="font-medium">{file.filename}</TableCell>
            <TableCell className="uppercase">{file.fileType}</TableCell>
            <TableCell>{formatFileSize(file.fileSize)}</TableCell>
            <TableCell>
              {new Date(file.uploadedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <a
                  href={file.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReprocess(file.id)}
                >
                  Re-process
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
