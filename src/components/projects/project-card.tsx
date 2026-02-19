"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  projectType: "EG_PURSUIT" | "DELIVERY";
  createdAt: string;
  updatedAt: string;
  _count: {
    sourceFiles: number;
    markdownSummaries: number;
  };
}

export function ProjectCard({
  id,
  name,
  description,
  projectType,
  createdAt,
  updatedAt,
  _count,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="outline" className="shrink-0 text-xs">
              {projectType === "EG_PURSUIT" ? "EG Pursuit" : "Delivery"}
            </Badge>
          </div>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{_count.sourceFiles} files</span>
            <span>{_count.markdownSummaries} summaries</span>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>Created {new Date(createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
