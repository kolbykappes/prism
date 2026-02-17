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
const MAX_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback((f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    if (![".txt", ".vtt", ".srt", ".pdf", ".md"].includes(ext)) {
      toast.error("Unsupported file type. Allowed: .txt, .vtt, .srt, .pdf, .md");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }
    setFile(f);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("[upload]", data);
        toast.error(data.detail || data.error || "Upload failed");
        return;
      }

      toast.success("File uploaded, processing started");
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (error) {
      console.error("[upload]", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFile(null); }}>
      <DialogTrigger asChild>
        <Button><Upload /> Upload File</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Source File</DialogTitle>
        </DialogHeader>

        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          {file ? (
            <div className="text-center">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X /> Remove
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Drag and drop a file here, or
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <FileUp /> Choose File
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                .txt, .vtt, .srt, .pdf, .md (max 50MB)
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {file && (
          <Button onClick={handleUpload} disabled={uploading}>
            <Upload /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
