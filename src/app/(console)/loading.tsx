import { CardSkeleton, TableSkeleton } from "@/components/sb/skeletons";

export default function ConsoleLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
