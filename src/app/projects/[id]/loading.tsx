import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div>
      <Skeleton className="mb-2 h-4 w-24" />
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
