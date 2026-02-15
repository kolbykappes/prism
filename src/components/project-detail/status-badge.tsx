import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  queued: { label: "Queued", variant: "outline" as const, className: "border-yellow-500 text-yellow-700" },
  processing: { label: "Processing", variant: "outline" as const, className: "border-blue-500 text-blue-700" },
  complete: { label: "Complete", variant: "outline" as const, className: "border-green-500 text-green-700" },
  failed: { label: "Failed", variant: "destructive" as const, className: "" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.queued;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
