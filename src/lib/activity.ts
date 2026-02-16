import { prisma } from "@/lib/prisma";
import { ActivityAction, Prisma } from "@/generated/prisma";

export function logActivity(params: {
  projectId: string;
  action: ActivityAction;
  sourceFileId?: string;
  userName?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const { projectId, action, sourceFileId, userName = "Kolby", metadata } = params;

  prisma.activityLog
    .create({
      data: {
        projectId,
        action,
        sourceFileId: sourceFileId ?? null,
        userName,
        metadata: metadata ?? Prisma.JsonNull,
      },
    })
    .catch((err) => console.error("Failed to log activity:", err));
}
