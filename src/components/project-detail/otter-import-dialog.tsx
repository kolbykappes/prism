"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function OtterImportDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function reset() {
    setTitle("");
    setTranscript("");
    setSpeakers("");
    setMeetingDate("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Meeting title is required");
      return;
    }
    if (!transcript.trim()) {
      toast.error("Transcript text is required");
      return;
    }

    setSubmitting(true);
    try {
      const speakerList = speakers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/ingest/otter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source": "app",
        },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          transcript: transcript.trim(),
          speakers: speakerList.length > 0 ? speakerList : undefined,
          meetingDate: meetingDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to import transcript");
        return;
      }

      toast.success("Transcript imported, processing started");
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Failed to import transcript");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Mic /> Import Transcript</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Otter Transcript</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="otter-title">Meeting Title *</Label>
            <Input
              id="otter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Standup 2/16"
            />
          </div>
          <div>
            <Label htmlFor="otter-transcript">Transcript *</Label>
            <Textarea
              id="otter-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full transcript text here..."
              rows={10}
            />
          </div>
          <div>
            <Label htmlFor="otter-speakers">Speakers</Label>
            <Input
              id="otter-speakers"
              value={speakers}
              onChange={(e) => setSpeakers(e.target.value)}
              placeholder="Comma-separated: Alice, Bob, Charlie"
            />
          </div>
          <div>
            <Label htmlFor="otter-date">Meeting Date</Label>
            <Input
              id="otter-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Importing..." : "Import Transcript"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
