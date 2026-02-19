"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, RotateCw, Trash2, FileText, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  contentDate: string | null;
  contentDateSource: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  // datetime-local input expects "YYYY-MM-DDTHH:mm" in local time
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function contentDateSourceLabel(source: string | null): string {
  if (source === "extracted") return "extracted";
  if (source === "manual") return "manual";
  if (source === "uploaded") return "upload date";
  return "—";
}

function EditContentDateDialog({
  open,
  onOpenChange,
  file,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: SourceFile;
  projectId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(toDatetimeLocal(file.contentDate ?? file.uploadedAt));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentDate: new Date(value).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update content date");
        return;
      }
      toast.success("Content date updated");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to update content date");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Content Date</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-2 break-all">{file.filename}</div>
        <div className="space-y-2">
          <Label htmlFor="content-date">Content created at</Label>
          <Input
            id="content-date"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This date is used to chronologically sequence the knowledge base during compression.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !value}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [editingFile, setEditingFile] = useState<SourceFile | null>(null);

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
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="hidden md:table-cell">Content Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium max-w-[200px]">
                <div className="truncate">{file.filename}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{file.uploadedBy}</div>
              </TableCell>
              <TableCell className="hidden sm:table-cell uppercase text-sm">{file.fileType}</TableCell>
              <TableCell className="hidden sm:table-cell text-sm">{formatFileSize(file.fileSize)}</TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {file.contentDate ? (
                  <>
                    <div>{new Date(file.contentDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
                    <div className="text-xs text-muted-foreground">{contentDateSourceLabel(file.contentDateSource)}</div>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  {onViewSummary && (
                    <Button
                      variant="outline"
                      size="sm"
                      title="View Summary"
                      onClick={() => onViewSummary(file.id)}
                    >
                      <FileText />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    title="Edit content date"
                    onClick={() => setEditingFile(file)}
                  >
                    <Pencil />
                  </Button>
                  <a
                    href={file.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" title="Download">
                      <Download />
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Re-process"
                    onClick={() => handleReprocess(file.id)}
                  >
                    <RotateCw />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    title="Delete"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingFile && (
        <EditContentDateDialog
          open={editingFile !== null}
          onOpenChange={(open) => { if (!open) setEditingFile(null); }}
          file={editingFile}
          projectId={projectId}
        />
      )}
    </>
  );
}
