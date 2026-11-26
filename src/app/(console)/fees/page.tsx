import { Suspense } from "react";
import { SectionBoundary } from "@/components/sb/section-boundary";
import { CardSkeleton } from "@/components/sb/skeletons";
import { TopBar } from "@/components/sb/top-bar";
import { ExampleCard } from "@/features/fees/components/example-card";
import { FeeSettingsForm, FeeSettingsReadOnly } from "@/features/fees/components/fee-settings-form";
import { OverridesCard } from "@/features/fees/components/overrides-card";
import { getFeeOverrides, getFeeSettings, OVERRIDE_LIMIT } from "@/features/fees/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-role";

async function Defaults({ canChange }: { canChange: boolean }) {
  const settings = await getFeeSettings();
  return canChange ? <FeeSettingsForm settings={settings} /> : <FeeSettingsReadOnly settings={settings} />;
}

async function Overrides({ canChange, canSearchSalons }: { canChange: boolean; canSearchSalons: boolean }) {
  const overrides = await getFeeOverrides();
  return (
    <OverridesCard
      overrides={overrides}
      canChange={canChange}
      canSearchSalons={canSearchSalons}
      mayHaveMore={overrides.length >= OVERRIDE_LIMIT}
    />
  );
}

export default async function FeesPage() {
  const me = await requirePermission("fees.view");
  const canChange = hasPermission(me, "fees.change");
  return (
    <>
      <TopBar title="Fees and commission" subtitle="Platform defaults and salon overrides" />
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6">
        <SectionBoundary title="Couldn't load platform defaults">
          <Suspense fallback={<CardSkeleton className="h-96" />}>
            <Defaults canChange={canChange} />
          </Suspense>
        </SectionBoundary>
        <div className="space-y-6">
          <ExampleCard />
          <SectionBoundary title="Couldn't load salon overrides">
            <Suspense fallback={<CardSkeleton className="h-40" />}>
              <Overrides canChange={canChange} canSearchSalons={hasPermission(me, "salons.view")} />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>
    </>
  );
}
