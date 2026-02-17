"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface UsageLog {
  id: string;
  projectName: string | null;
  filename: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number | null;
  createdAt: string;
}

export function AdminUsageTable() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/admin/usage");
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error("[admin-usage]", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const totalTokensUsed = logs.reduce((sum, l) => sum + l.totalTokens, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin — Token Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {logs.length} API calls tracked &middot;{" "}
          {totalTokensUsed.toLocaleString()} total tokens used
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No usage logs yet. Process a file to see token usage here.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.projectName ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.filename ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.model}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.inputTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.outputTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {log.totalTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.durationMs
                      ? `${(log.durationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
