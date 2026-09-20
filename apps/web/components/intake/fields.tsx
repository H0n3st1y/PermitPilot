"use client";

import type { RefObject } from "react";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import { TRADE_LABELS, type Trade } from "@/lib/types";

/**
 * Form primitives shared by the intake steps.
 *
 * Each one owns its own label, hint, and error wiring so a step component
 * describes what it is asking for rather than how an input is assembled.
 */

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="field-error mt-1">
      {message}
    </p>
  );
}

export function NumberField({
  name,
  label,
  hint,
  prefix,
  suffix,
  value,
  min,
  step,
  error,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  value: number;
  min: number;
  step?: number;
  error?: string;
  onChange: (value: number) => void;
}) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="relative max-w-xs">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            {prefix}
          </span>
        ) : null}
        <input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          step={step ?? 1}
          className={`num ${prefix ? "!pl-7" : ""} ${suffix ? "!pr-16" : ""}`}
          value={Number.isFinite(value) ? value : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={`${name}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${name}-error`} message={error} /> : null}
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        className="max-w-sm"
        value={value}
        aria-describedby={hint ? `${name}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={`${name}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TradeChecks({ trades, onChange }: { trades: Trade[]; onChange: (trades: Trade[]) => void }) {
  const { t } = useCopy();
  const labels = useLabels();
  return (
    <fieldset>
      <legend className="field-label">{t("intake.space.tradesLegend")}</legend>
      <p className="field-hint">{t("intake.space.tradesHint")}</p>
      <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
        {(Object.keys(TRADE_LABELS) as Trade[]).map((trade) => (
          <label key={trade} className="check-row">
            <input
              type="checkbox"
              checked={trades.includes(trade)}
              onChange={() =>
                onChange(trades.includes(trade) ? trades.filter((item) => item !== trade) : [...trades, trade])
              }
            />
            {labels.trade(trade)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A heading that the step wizard moves focus to after each page change. */
export function StepHeading({
  headingRef,
  title,
  children,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="page-title">
        {title}
      </h1>
      {children ? <p className="mt-2 text-[var(--ink-2)]">{children}</p> : null}
    </div>
  );
}
