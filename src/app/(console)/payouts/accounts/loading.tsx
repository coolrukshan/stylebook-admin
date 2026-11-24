import { CardSkeleton, TableSkeleton } from "@/components/sb/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton />
      <CardSkeleton className="h-64" />
    </div>
  );
}
