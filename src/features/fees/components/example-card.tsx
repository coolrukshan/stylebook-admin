const ROWS = ["Service commission", "Product commission", "Tip commission", "Salon receives"];

/** The API has no preview endpoint and the console never calculates fees. */
export function ExampleCard() {
  return (
    <section aria-labelledby="example-title" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 id="example-title" className="text-lg font-semibold text-text">
        Example · LKR 5,000 booking + LKR 2,000 product + LKR 500 tip
      </h2>
      <dl className="mt-3 space-y-2">
        {ROWS.map((r) => (
          <div key={r} className="flex justify-between gap-4">
            <dt className="text-text-2">{r}</dt>
            <dd className="text-muted-foreground">Not available yet</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">The worked example needs a preview from the API.</p>
    </section>
  );
}
