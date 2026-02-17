"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { toast } from "sonner";

interface ProjectPerson {
  id: string;
  role: string | null;
  notes: string | null;
  autoExtracted: boolean;
  addedAt: string;
  person: {
    id: string;
    name: string;
    email: string | null;
    organization: string | null;
    role: string | null;
  };
}

interface PersonFormData {
  name: string;
  email: string;
  organization: string;
  role: string;
  notes: string;
}

const emptyForm: PersonFormData = {
  name: "",
  email: "",
  organization: "",
  role: "",
  notes: "",
};

export function PeopleTab({
  people,
  projectId,
}: {
  people: ProjectPerson[];
  projectId: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ProjectPerson | null>(null);
  const [form, setForm] = useState<PersonFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function openEdit(pp: ProjectPerson) {
    setEditingPerson(pp);
    setForm({
      name: pp.person.name,
      email: pp.person.email ?? "",
      organization: pp.person.organization ?? "",
      role: pp.role ?? pp.person.role ?? "",
      notes: pp.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("[people-add]", data);
        toast.error(data.detail || data.error || "Failed to add person");
        return;
      }
      toast.success("Person added");
      setAddOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch (error) {
      console.error("[people-add]", error);
      toast.error("Failed to add person");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editingPerson || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/people/${editingPerson.person.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[people-edit]", data);
        toast.error(data.detail || data.error || "Failed to update person");
        return;
      }
      toast.success("Person updated");
      setEditOpen(false);
      setEditingPerson(null);
      setForm(emptyForm);
      router.refresh();
    } catch (error) {
      console.error("[people-edit]", error);
      toast.error("Failed to update person");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(pp: ProjectPerson) {
    if (!confirm(`Remove ${pp.person.name} from this project?`)) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/people/${pp.person.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[people-remove]", data);
        toast.error(data.detail || data.error || "Failed to remove person");
        return;
      }
      toast.success("Person removed");
      router.refresh();
    } catch (error) {
      console.error("[people-remove]", error);
      toast.error("Failed to remove person");
    }
  }

  function PersonFormFields({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            placeholder="Company or team"
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Project Manager, Engineer"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional context..."
            rows={2}
          />
        </div>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button><UserPlus /> Add Person</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Person</DialogTitle>
              </DialogHeader>
              <PersonFormFields onSubmit={handleAdd} submitLabel="Add Person" />
            </DialogContent>
          </Dialog>
        </div>
        <EmptyState
          title="No people"
          description="Add people to this project to track stakeholders, participants, and contacts."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><UserPlus /> Add Person</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Person</DialogTitle>
            </DialogHeader>
            <PersonFormFields onSubmit={handleAdd} submitLabel="Add Person" />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Added</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((pp) => (
            <TableRow key={pp.id}>
              <TableCell className="font-medium">{pp.person.name}</TableCell>
              <TableCell>{pp.person.email ?? "—"}</TableCell>
              <TableCell>{pp.person.organization ?? "—"}</TableCell>
              <TableCell>{pp.role ?? pp.person.role ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={pp.autoExtracted ? "secondary" : "default"}>
                  {pp.autoExtracted ? "auto" : "manual"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(pp.addedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(pp)}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(pp)}
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingPerson(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <PersonFormFields onSubmit={handleEdit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
