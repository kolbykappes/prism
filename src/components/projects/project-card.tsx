"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
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
  createdAt,
  updatedAt,
  _count,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:shadow-md">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
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
