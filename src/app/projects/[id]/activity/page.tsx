import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  uploaded: "uploaded a file",
  reprocessed: "re-processed a file",
  deleted: "deleted a file",
  summary_completed: "summary completed",
  project_created: "created the project",
};

function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    notFound();
  }

  const logs = await prisma.activityLog.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-2">
        <Link
          href={`/projects/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to {project.name}
        </Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold">Activity Log</h1>

      {logs.length === 0 ? (
        <p className="text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const meta = log.metadata as Record<string, string> | null;
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-md border px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{log.userName}</span>{" "}
                    {getActionLabel(log.action)}
                    {meta?.filename && (
                      <span className="text-muted-foreground">
                        {" — "}
                        {meta.filename}
                      </span>
                    )}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {log.createdAt.toLocaleString()}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
