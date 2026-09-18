"use client";

import { NumberField, SelectField, StepHeading, TradeChecks } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { usesValuation } from "@/lib/intake";
import {
  OCCUPANCY_LABELS,
  ZONE_LABELS,
  type OccupancyGroup,
  type ZoneDistrict,
} from "@/lib/types";

/** Size, location, and trades: the answers that decide reviews and fees. */
export function SpaceStep({ config, errors, headingRef, update }: IntakeStepProps) {
  const occupantLoad = estimateOccupantLoad(config.squareFootage || 0, config.occupancy);
  const hasArea = Number.isFinite(config.squareFootage) && config.squareFootage > 0;

  return (
    <div className="space-y-6">
      <StepHeading headingRef={headingRef} title="About the space">
        Size, location, and the work involved decide which reviews and fees apply.
      </StepHeading>

      <NumberField
        name="squareFootage"
        label="Floor area"
        suffix="sq ft"
        hint={
          hasArea
            ? `Sized for about ${occupantLoad} ${occupantLoad === 1 ? "person" : "people"} at this use.`
            : "The area of the space you're using or building."
        }
        value={config.squareFootage}
        min={1}
        error={errors.squareFootage}
        onChange={(value) => update("squareFootage", value)}
      />

      <SelectField
        name="zone"
        label="Zoning district"
        hint="Check your parcel on the city's zoning map. Waterfront parcels get an extra review."
        value={config.zone}
        options={ZONE_LABELS}
        onChange={(value) => update("zone", value as ZoneDistrict)}
      />

      {/* Occupancy is set from the project type; most applicants never touch it. */}
      <details className="disclosure">
        <summary>
          Building use: {OCCUPANCY_LABELS[config.occupancy]}
          <span className="font-normal text-[var(--muted)]"> · change</span>
        </summary>
        <div className="mt-2">
          <SelectField
            name="occupancy"
            label="Occupancy group"
            hint="Set from your project type. Change it only if the space is classified differently."
            value={config.occupancy}
            options={OCCUPANCY_LABELS}
            onChange={(value) => update("occupancy", value as OccupancyGroup)}
          />
        </div>
      </details>

      {usesValuation(config.projectType) ? (
        <NumberField
          name="estimatedValuation"
          label="Estimated construction cost"
          prefix="$"
          hint="Used to calculate the building permit fee. A contractor's estimate is fine."
          value={config.estimatedValuation}
          min={0}
          step={500}
          error={errors.estimatedValuation}
          onChange={(value) => update("estimatedValuation", value)}
        />
      ) : null}

      {/* Events rarely involve trade work, so it starts collapsed for them. */}
      {config.projectType === "public_event" && config.trades.length === 0 ? (
        <details className="disclosure">
          <summary>Any electrical, plumbing, HVAC, or gas work?</summary>
          <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
        </details>
      ) : (
        <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
      )}
    </div>
  );
}
