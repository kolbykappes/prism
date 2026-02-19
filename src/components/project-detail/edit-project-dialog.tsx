"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  businessUnits: { id: string; name: string }[];
}

export function EditProjectDialog({
  projectId,
  name,
  description,
  projectType,
  companyId,
  businessUnitId,
}: {
  projectId: string;
  name: string;
  description: string | null;
  projectType: "EG_PURSUIT" | "DELIVERY";
  companyId: string | null;
  businessUnitId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [typeValue, setTypeValue] = useState<"DELIVERY" | "EG_PURSUIT">(projectType ?? "DELIVERY");
  const [companyValue, setCompanyValue] = useState(companyId ?? "");
  const [buValue, setBuValue] = useState(businessUnitId ?? "");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Sync form state when props change
  useEffect(() => {
    setNameValue(name);
    setDescriptionValue(description ?? "");
    setTypeValue(projectType ?? "DELIVERY");
    setCompanyValue(companyId ?? "");
    setBuValue(businessUnitId ?? "");
  }, [name, description, projectType, companyId, businessUnitId]);

  // Fetch companies when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => {});
  }, [open]);

  // Reset BU when company changes
  function handleCompanyChange(id: string) {
    setCompanyValue(id);
    setBuValue("");
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setNameValue(name);
      setDescriptionValue(description ?? "");
      setTypeValue(projectType ?? "DELIVERY");
      setCompanyValue(companyId ?? "");
      setBuValue(businessUnitId ?? "");
    }
    setOpen(val);
  }

  const selectedCompany = companies.find((c) => c.id === companyValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameValue.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue,
          description: descriptionValue,
          projectType: typeValue,
          companyId: companyValue || null,
          businessUnitId: buValue || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update project");
        return;
      }

      toast.success("Project updated");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Project Name</Label>
            <Input
              id="edit-name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Project Type</Label>
            <select
              id="edit-type"
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value as "DELIVERY" | "EG_PURSUIT")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="DELIVERY">Delivery</option>
              <option value="EG_PURSUIT">EG Pursuit</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-company">Company (optional)</Label>
            <select
              id="edit-company"
              value={companyValue}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— None —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {selectedCompany && selectedCompany.businessUnits.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-bu">Business Unit (optional)</Label>
              <select
                id="edit-bu"
                value={buValue}
                onChange={(e) => setBuValue(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— None —</option>
                {selectedCompany.businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>{bu.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !nameValue.trim()}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
