import axe from "axe-core";

/** Runs axe on a container; returns violations (empty = pass). */
export async function axeViolations(container: Element) {
  const results = await axe.run(container, {
    // jsdom has no layout, so contrast checks are unreliable; covered in e2e.
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations;
}
