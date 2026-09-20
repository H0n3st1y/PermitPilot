"use client";

import { NumberField, SelectField, StepHeading, TradeChecks } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import { usesValuation } from "@/lib/intake";
import type { OccupancyGroup, ZoneDistrict } from "@/lib/types";

/** Size, location, and trades: the answers that decide reviews and fees. */
export function SpaceStep({ config, errors, headingRef, update }: IntakeStepProps) {
  const { t } = useCopy();
  const labels = useLabels();
  const occupantLoad = estimateOccupantLoad(config.squareFootage || 0, config.occupancy);
  const hasArea = Number.isFinite(config.squareFootage) && config.squareFootage > 0;

  return (
    <div className="space-y-6">
      <StepHeading headingRef={headingRef} title={t("intake.space.title")}>
        {t("intake.space.lede")}
      </StepHeading>

      <NumberField
        name="squareFootage"
        label={t("intake.space.floorArea")}
        suffix={t("intake.space.sqft")}
        hint={
          hasArea
            ? t(occupantLoad === 1 ? "intake.space.occupantHintOne" : "intake.space.occupantHintMany", {
                count: occupantLoad,
              })
            : t("intake.space.areaHint")
        }
        value={config.squareFootage}
        min={1}
        error={errors.squareFootage ? t(errors.squareFootage) : undefined}
        onChange={(value) => update("squareFootage", value)}
      />

      <SelectField
        name="zone"
        label={t("intake.space.zone")}
        hint={t("intake.space.zoneHint")}
        value={config.zone}
        options={labels.zoneOptions}
        onChange={(value) => update("zone", value as ZoneDistrict)}
      />

      {/* Occupancy is set from the project type; most applicants never touch it. */}
      <details className="disclosure">
        <summary>
          {t("intake.space.buildingUse", { occupancy: labels.occupancy(config.occupancy) })}
          <span className="font-normal text-[var(--muted)]">{t("intake.space.change")}</span>
        </summary>
        <div className="mt-2">
          <SelectField
            name="occupancy"
            label={t("intake.space.occupancy")}
            hint={t("intake.space.occupancyHint")}
            value={config.occupancy}
            options={labels.occupancyOptions}
            onChange={(value) => update("occupancy", value as OccupancyGroup)}
          />
        </div>
      </details>

      {usesValuation(config.projectType) ? (
        <NumberField
          name="estimatedValuation"
          label={t("intake.space.valuation")}
          prefix="$"
          hint={t("intake.space.valuationHint")}
          value={config.estimatedValuation}
          min={0}
          step={500}
          error={errors.estimatedValuation ? t(errors.estimatedValuation) : undefined}
          onChange={(value) => update("estimatedValuation", value)}
        />
      ) : null}

      {/* Events rarely involve trade work, so it starts collapsed for them. */}
      {config.projectType === "public_event" && config.trades.length === 0 ? (
        <details className="disclosure">
          <summary>{t("intake.space.eventTrades")}</summary>
          <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
        </details>
      ) : (
        <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
      )}
    </div>
  );
}
