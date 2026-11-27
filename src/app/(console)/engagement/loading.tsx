import { CardSkeleton } from "@/components/sb/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <CardSkeleton className="h-64" />
    </div>
  );
}
