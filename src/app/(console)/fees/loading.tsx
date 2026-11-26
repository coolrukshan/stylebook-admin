import { CardSkeleton } from "@/components/sb/skeletons";

export default function Loading() {
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
      <CardSkeleton className="h-96" />
      <CardSkeleton className="h-64" />
    </div>
  );
}
