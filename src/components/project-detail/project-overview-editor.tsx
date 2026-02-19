"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Pencil, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function ProjectOverviewEditor({
  projectId,
  initialOverview,
}: {
  projectId: string;
  initialOverview: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
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
      setExpanded(true);
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
      <div className="mb-4 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Project Overview</h2>
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
      <div className="mb-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" /> Add Project Overview
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border">
      {/* Collapsed header — always visible */}
      <button
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">Project Overview</span>
        {!expanded && (
          <span className="ml-1 truncate text-sm text-muted-foreground">
            — {initialOverview.split("\n")[0].replace(/^#+\s*/, "")}
          </span>
        )}
        <div className="ml-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); setEditing(true); }}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          <MarkdownRenderer content={initialOverview} />
        </div>
      )}
    </div>
  );
}
