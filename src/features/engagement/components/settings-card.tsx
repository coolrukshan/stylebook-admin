import { HoldoutReset } from "./holdout-reset";

const ROWS = ["Stage thresholds", "Frequency cap", "Quiet hours", "Holdout percentage", "Channels", "Message model"];

/** The API exposes no engine settings, so none are hard-coded here. */
export function SettingsCard({ canReset }: { canReset: boolean }) {
  return (
    <section aria-labelledby="settings-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 id="settings-title" className="text-lg font-semibold text-text">
        Engine settings
      </h2>
      <dl className="mt-2">
        {ROWS.map((r) => (
          <div key={r} className="flex justify-between gap-4 border-b border-line py-3">
            <dt className="text-text-2">{r}</dt>
            <dd className="text-muted-foreground">Not available yet</dd>
          </div>
        ))}
      </dl>
      {canReset && (
        <div className="pt-4">
          <HoldoutReset />
        </div>
      )}
    </section>
  );
}
