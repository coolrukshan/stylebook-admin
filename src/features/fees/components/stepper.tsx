"use client";

import { Minus, Plus } from "lucide-react";
import { clamp, formatFee, parseField, toText, type FeeField } from "../fields";

const BTN =
  "grid size-9 place-items-center rounded-input border border-line-strong text-text outline-none hover:bg-soft focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40";

/** Typed or stepped value. `text` is owned by the form so invalid input is kept and flagged. */
export function Stepper({
  field,
  text,
  fallback,
  onChange,
}: {
  field: FeeField;
  text: string;
  /** Saved value, used to step from when the typed text is invalid. */
  fallback: number;
  onChange: (text: string) => void;
}) {
  const value = parseField(field, text);
  const current = value ?? fallback;
  const id = `fee-${field.key}`;
  const step = (dir: 1 | -1) => onChange(toText(field, clamp(field, current + dir * field.step)));
  const invalid = value === null;
  const range =
    field.unit === "percent" ? `Enter a whole number from ${field.min} to ${field.max}.` : "Enter rupees, for example 50 or 12.50.";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
      <div>
        <label htmlFor={id} className="font-semibold text-text">
          {field.label}
        </label>
        <p className="text-sm text-muted-foreground">{field.helper}</p>
        {invalid && (
          <p id={`${id}-error`} role="alert" className="text-sm text-danger">
            {range}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={BTN} aria-label={`Decrease ${field.label}`} disabled={current <= field.min} onClick={() => step(-1)}>
          <Minus aria-hidden className="size-4" />
        </button>
        <span className="flex items-center gap-1">
          {field.unit === "money" && <span aria-hidden className="text-sm text-muted-foreground">LKR</span>}
          <input
            id={id}
            role="spinbutton"
            inputMode={field.unit === "money" ? "decimal" : "numeric"}
            aria-valuenow={value ?? undefined}
            aria-valuemin={field.min}
            aria-valuemax={field.max ?? undefined}
            aria-valuetext={value === null ? text : formatFee(field, value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            }}
            className="w-20 rounded-input border border-transparent bg-transparent py-1 text-center text-lg font-semibold text-text outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-amber aria-invalid:border-danger"
          />
          {field.unit === "percent" && <span aria-hidden className="font-semibold text-text">%</span>}
        </span>
        <button
          type="button"
          className={BTN}
          aria-label={`Increase ${field.label}`}
          disabled={field.max !== null && current >= field.max}
          onClick={() => step(1)}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
