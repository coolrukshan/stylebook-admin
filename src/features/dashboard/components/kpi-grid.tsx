import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton } from "@/components/sb/skeletons";
import { StatCard } from "@/components/sb/stat-card";
import {
  getActiveSalons, getBookings, getCommission, getGmv, getOpenDisputes, getSignups, type CardData,
} from "../queries";

async function Card({ label, load }: { label: string; load: () => Promise<CardData> }) {
  const { value, hint } = await load();
  return <StatCard label={label} value={value} hint={hint} />;
}

const CARDS: ReadonlyArray<{ label: string; load: () => Promise<CardData> }> = [
  { label: "Active salons", load: getActiveSalons },
  { label: "New sign-ups", load: getSignups },
  { label: "Bookings", load: getBookings },
  { label: "GMV", load: getGmv },
  { label: "Commission", load: getCommission },
  { label: "Open disputes", load: getOpenDisputes },
];

/** Six independent cards: each has its own boundary and skeleton. */
export function KpiGrid() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {CARDS.map((c) => (
        <SectionBoundary key={c.label} title={`Couldn't load ${c.label}`}>
          <Suspense fallback={<CardSkeleton />}>
            <Card label={c.label} load={c.load} />
          </Suspense>
        </SectionBoundary>
      ))}
    </div>
  );
}
