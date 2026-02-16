"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

export function ProjectOverviewEditor({
  projectId,
  initialOverview,
}: {
  projectId: string;
  initialOverview: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [overview, setOverview] = useState(initialOverview ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overview }),
      });
      if (!res.ok) {
        toast.error("Failed to save overview");
        return;
      }
      toast.success("Overview saved");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to save overview");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setOverview(initialOverview ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Project Overview</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <Textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          placeholder="Write a project overview using markdown..."
          rows={6}
          className="font-mono text-sm"
        />
      </div>
    );
  }

  if (!initialOverview) {
    return (
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          <Pencil /> Add Project Overview
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Project Overview</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      </div>
      <MarkdownRenderer content={initialOverview} />
    </div>
  );
}
