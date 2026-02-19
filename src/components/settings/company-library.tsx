"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  markdownContent: string | null;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
  description: string | null;
  markdownContent: string | null;
  businessUnits: BusinessUnit[];
  _count: { projects: number };
}

// Shared markdown editor with file upload + paste tabs
function MarkdownEditor({
  value,
  onChange,
  label = "Context Document (Markdown)",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && file.type !== "text/markdown" && file.type !== "text/plain") {
      toast.error("Please select a .md file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange((ev.target?.result as string) ?? "");
      setTab("paste");
      toast.success("File loaded");
    };
    reader.readAsText(file);
    // reset so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1 border-b mb-2">
        <button
          type="button"
          onClick={() => setTab("paste")}
          className={`px-3 py-1 text-sm ${tab === "paste" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          Paste / Type
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`px-3 py-1 text-sm ${tab === "upload" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          Upload .md file
        </button>
      </div>
      {tab === "upload" ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Select a .md file to load its contents</p>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={handleFile}
            className="hidden"
            id="md-file-upload"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          {value && (
            <p className="mt-2 text-xs text-muted-foreground">{value.length} characters loaded — switch to Paste tab to review</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste markdown content here…"
          rows={10}
          className="font-mono text-sm"
        />
      )}
    </div>
  );
}

// Dialog for create/edit Company
function CompanyDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Company;
  onSaved: (company: Company) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [markdownContent, setMarkdownContent] = useState(initial?.markdownContent ?? "");
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens with new initial
  function handleOpenChange(v: boolean) {
    if (v) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setMarkdownContent(initial?.markdownContent ?? "");
    }
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial ? `/api/companies/${initial.id}` : "/api/companies";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, markdownContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save company");
        return;
      }
      const saved = await res.json();
      onSaved({ ...saved, businessUnits: initial?.businessUnits ?? [], _count: initial?._count ?? { projects: 0 } });
      onOpenChange(false);
      toast.success(initial ? "Company updated" : "Company created");
    } catch {
      toast.error("Failed to save company");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-desc">Description (optional)</Label>
              <Input id="company-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <MarkdownEditor value={markdownContent} onChange={setMarkdownContent} />
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for create/edit Business Unit
function BusinessUnitDialog({
  open,
  onOpenChange,
  companyId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  initial?: BusinessUnit;
  onSaved: (bu: BusinessUnit) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [markdownContent, setMarkdownContent] = useState(initial?.markdownContent ?? "");
  const [saving, setSaving] = useState(false);

  function handleOpenChange(v: boolean) {
    if (v) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setMarkdownContent(initial?.markdownContent ?? "");
    }
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial ? `/api/business-units/${initial.id}` : "/api/business-units";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name, description, markdownContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save business unit");
        return;
      }
      const saved = await res.json();
      onSaved(saved);
      onOpenChange(false);
      toast.success(initial ? "Business unit updated" : "Business unit created");
    } catch {
      toast.error("Failed to save business unit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Business Unit" : "Add Business Unit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="bu-name">Business Unit Name</Label>
              <Input id="bu-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bu-desc">Description (optional)</Label>
              <Input id="bu-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <MarkdownEditor value={markdownContent} onChange={setMarkdownContent} />
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Row for a single company with inline BU management
function CompanyRow({
  company,
  onUpdated,
  onDeleted,
}: {
  company: Company;
  onUpdated: (c: Company) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addBuOpen, setAddBuOpen] = useState(false);
  const [editBu, setEditBu] = useState<BusinessUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete company");
        return;
      }
      onDeleted(company.id);
      toast.success("Company deleted");
    } catch {
      toast.error("Failed to delete company");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteBu(bu: BusinessUnit) {
    if (!confirm(`Delete "${bu.name}"?`)) return;
    try {
      const res = await fetch(`/api/business-units/${bu.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete business unit");
        return;
      }
      onUpdated({ ...company, businessUnits: company.businessUnits.filter((b) => b.id !== bu.id) });
      toast.success("Business unit deleted");
    } catch {
      toast.error("Failed to delete business unit");
    }
  }

  return (
    <div className="rounded-lg border">
      {/* Company header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{company.name}</p>
          {company.description && (
            <p className="text-sm text-muted-foreground truncate">{company.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">{company.businessUnits.length} BU{company.businessUnits.length !== 1 ? "s" : ""}</Badge>
          {company._count.projects > 0 && (
            <Badge variant="outline">{company._count.projects} project{company._count.projects !== 1 ? "s" : ""}</Badge>
          )}
          {company.markdownContent && (
            <Badge variant="outline" className="text-xs">Has context</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded: BU list */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2">
          {company.businessUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No business units yet.</p>
          ) : (
            company.businessUnits.map((bu) => (
              <div key={bu.id} className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{bu.name}</p>
                  {bu.description && (
                    <p className="text-xs text-muted-foreground truncate">{bu.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {bu.markdownContent && (
                    <Badge variant="outline" className="text-xs">Has context</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditBu(bu)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBu(bu)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <Button variant="outline" size="sm" onClick={() => setAddBuOpen(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Business Unit
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CompanyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={company}
        onSaved={(updated) => onUpdated({ ...updated, businessUnits: company.businessUnits, _count: company._count })}
      />
      <BusinessUnitDialog
        open={addBuOpen}
        onOpenChange={setAddBuOpen}
        companyId={company.id}
        onSaved={(bu) => onUpdated({ ...company, businessUnits: [...company.businessUnits, bu] })}
      />
      {editBu && (
        <BusinessUnitDialog
          open={true}
          onOpenChange={(v) => { if (!v) setEditBu(null); }}
          companyId={company.id}
          initial={editBu}
          onSaved={(updated) => {
            onUpdated({ ...company, businessUnits: company.businessUnits.map((b) => b.id === updated.id ? updated : b) });
            setEditBu(null);
          }}
        />
      )}
    </div>
  );
}

export function CompanyLibrary({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [addOpen, setAddOpen] = useState(false);

  function handleUpdated(updated: Company) {
    setCompanies((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  function handleDeleted(id: string) {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  function handleCreated(company: Company) {
    setCompanies((prev) => [...prev, company].sort((a, b) => a.name.localeCompare(b.name)));
  }

  return (
    <div className="space-y-3">
      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No companies yet. Add one to get started.</p>
      ) : (
        companies.map((company) => (
          <CompanyRow
            key={company.id}
            company={company}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))
      )}

      <Button variant="outline" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add Company
      </Button>

      <CompanyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={handleCreated}
      />
    </div>
  );
}
