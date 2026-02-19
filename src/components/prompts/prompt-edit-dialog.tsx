"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  name: string;
  slug: string | null;
  content: string;
  isDefault: boolean;
}

const SLUG_ROUTING: Record<string, { label: string; fileTypes: string; note?: string }> = {
  meeting_transcript: {
    label: "Meeting Transcript",
    fileTypes: ".vtt, .srt, .txt (when detected as a transcript)",
  },
  general_content: {
    label: "General Content",
    fileTypes: ".pdf, .md, .email, .ics, .txt (when detected as a document)",
  },
  kb_compression: {
    label: "Knowledge Base Compression",
    fileTypes: "Used when compressing the project knowledge base",
    note: "This prompt acts as a system message. The {{filename}}, {{fileType}}, {{people}}, and {{extractedText}} placeholders are not used — the summaries are passed separately.",
  },
};

export function PromptEditDialog({
  template,
  trigger,
  onSaved,
}: {
  template?: PromptTemplate;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.name ?? "");
  const [content, setContent] = useState(template?.content ?? "");
  const [saving, setSaving] = useState(false);

  const isEdit = !!template;
  const routing = template?.slug ? SLUG_ROUTING[template.slug] : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/prompt-templates/${template.id}`
        : "/api/prompt-templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save template");
        return;
      }

      toast.success(isEdit ? "Template updated" : "Template created");
      setOpen(false);
      if (!isEdit) {
        setName("");
        setContent("");
      }
      onSaved();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && template) {
        setName(template.name);
        setContent(template.content);
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEdit ? "Edit Prompt Template" : "New Prompt Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">

            {/* System prompt routing info */}
            {routing && (
              <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm space-y-1">
                <p className="font-medium">{routing.label}</p>
                <p className="text-muted-foreground">Routes to: {routing.fileTypes}</p>
                {routing.note && (
                  <p className="text-muted-foreground">{routing.note}</p>
                )}
                <p className="text-muted-foreground pt-0.5">
                  Edits are saved to the database and persist across deploys.
                  The original is preserved in code and restored if the database is reset.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Detailed Meeting Notes"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Template Content</Label>
              {!routing?.note && (
                <p className="mb-1 text-xs text-muted-foreground">
                  Placeholders: <code className="font-mono">{"{{filename}}"}</code>,{" "}
                  <code className="font-mono">{"{{fileType}}"}</code>,{" "}
                  <code className="font-mono">{"{{people}}"}</code>,{" "}
                  <code className="font-mono">{"{{extractedText}}"}</code>
                </p>
              )}
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-sm"
                placeholder="Enter prompt template..."
                required
              />
            </div>

          </div>

          {/* Pinned footer */}
          <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
