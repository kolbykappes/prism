"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, X, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ACCEPTED_TYPES = ".txt,.vtt,.srt,.pdf,.md";
const ACCEPTED_EXTS = [".txt", ".vtt", ".srt", ".pdf", ".md"];
const MAX_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid: File[] = [];
    const list = Array.from(incoming);
    for (const f of list) {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTS.includes(ext)) {
        toast.error(`${f.name}: unsupported type (allowed: .txt, .vtt, .srt, .pdf, .md)`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: exceeds 50MB limit`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => {
      // deduplicate by name+size
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !existing.has(`${f.name}:${f.size}`))];
    });
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      setUploadingIndex(i);
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("[upload]", data);
          toast.error(`${file.name}: ${data.detail || data.error || "Upload failed"}`);
        } else {
          successCount++;
        }
      } catch (error) {
        console.error("[upload]", error);
        toast.error(`${file.name}: Upload failed`);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "File uploaded, processing started"
          : `${successCount} files uploaded, processing started`
      );
      router.refresh();
    }

    if (successCount === files.length) {
      setOpen(false);
      setFiles([]);
    } else {
      // Remove successfully uploaded files, keep failed ones
      setFiles((prev) => prev.slice(successCount));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFiles([]); }}>
      <DialogTrigger asChild>
        <Button><Upload /> Upload File</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Source Files</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 px-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              <FileUp /> Choose Files
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              .txt, .vtt, .srt, .pdf, .md · max 50MB each
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* File queue */}
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}:${f.size}`} className="flex items-center justify-between rounded-md px-3 py-1.5 bg-muted/50 text-sm">
                <span className="truncate font-medium mr-2">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground mr-2">{formatFileSize(f.size)}</span>
                <button
                  className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {files.length > 0 && (
          <Button onClick={handleUpload} disabled={uploading}>
            <Upload />
            {uploading
              ? `Uploading ${uploadingIndex + 1} of ${files.length}…`
              : files.length === 1
              ? "Upload"
              : `Upload ${files.length} files`}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
