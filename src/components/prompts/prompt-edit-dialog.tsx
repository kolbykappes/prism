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
  content: string;
  isDefault: boolean;
}

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Prompt Template" : "New Prompt Template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="content">
              Template Content
            </Label>
            <p className="mb-1 text-xs text-muted-foreground">
              Available placeholders: {"{{filename}}"}, {"{{fileType}}"}, {"{{extractedText}}"}
            </p>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Enter prompt template..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
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
