"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";
import { PromptEditDialog } from "./prompt-edit-dialog";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function PromptLibrary() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/prompt-templates");
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch {
      toast.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this prompt template?")) return;
    try {
      const res = await fetch(`/api/prompt-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/prompt-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        toast.error("Failed to set default");
        return;
      }
      toast.success("Default template updated");
      fetchTemplates();
    } catch {
      toast.error("Failed to set default");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading templates...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prompt Templates</h2>
        <PromptEditDialog
          trigger={
            <Button size="sm">
              <Plus /> New Template
            </Button>
          }
          onSaved={fetchTemplates}
        />
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="No prompt templates"
          description="Create a prompt template to customize how files are summarized."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  {t.isDefault && <Badge variant="secondary">Default</Badge>}
                </TableCell>
                <TableCell>
                  {new Date(t.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!t.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(t.id)}
                      >
                        <Star /> Set Default
                      </Button>
                    )}
                    <PromptEditDialog
                      template={t}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Pencil /> Edit
                        </Button>
                      }
                      onSaved={fetchTemplates}
                    />
                    {!t.isDefault && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 /> Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
