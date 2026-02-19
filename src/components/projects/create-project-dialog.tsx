"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "prism:create-project-defaults";

interface Company {
  id: string;
  name: string;
  businessUnits: { id: string; name: string }[];
}

function loadDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      projectType: "DELIVERY" | "EG_PURSUIT";
      companyId: string;
      businessUnitId: string;
    };
  } catch {
    return null;
  }
}

function saveDefaults(values: {
  projectType: "DELIVERY" | "EG_PURSUIT";
  companyId: string;
  businessUnitId: string;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"DELIVERY" | "EG_PURSUIT">("DELIVERY");
  const [companyId, setCompanyId] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load remembered defaults and fetch companies when dialog opens
  useEffect(() => {
    if (!open) return;

    const defaults = loadDefaults();
    if (defaults) {
      setProjectType(defaults.projectType);
      setCompanyId(defaults.companyId);
      setBusinessUnitId(defaults.businessUnitId);
    }

    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => {});
  }, [open]);

  function handleCompanyChange(id: string) {
    setCompanyId(id);
    setBusinessUnitId("");
  }

  const selectedCompany = companies.find((c) => c.id === companyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          projectType,
          companyId: companyId || null,
          businessUnitId: businessUnitId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create project");
        return;
      }

      // Remember selections for next time
      saveDefaults({ projectType, companyId, businessUnitId });

      const project = await res.json();
      toast.success("Project created");
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-type">Project Type</Label>
            <select
              id="project-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as "DELIVERY" | "EG_PURSUIT")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="DELIVERY">Delivery</option>
              <option value="EG_PURSUIT">EG Pursuit</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-company">Company (optional)</Label>
            <select
              id="create-company"
              value={companyId}
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
              <Label htmlFor="create-bu">Business Unit (optional)</Label>
              <select
                id="create-bu"
                value={businessUnitId}
                onChange={(e) => setBusinessUnitId(e.target.value)}
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
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
