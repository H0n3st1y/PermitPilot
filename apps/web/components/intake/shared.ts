import type { RefObject } from "react";
import type { IntakeErrors } from "@/lib/intake";
import type { ProjectConfig } from "@/lib/types";

/**
 * What every intake step needs: the answers so far, the errors to surface, a
 * setter, and the heading the wizard moves focus to when the page changes.
 *
 * Steps are presentation only. They collect answers; the rules engine decides
 * what those answers require, and never the other way round.
 */
export interface IntakeStepProps {
  config: ProjectConfig;
  errors: IntakeErrors;
  headingRef: RefObject<HTMLHeadingElement | null>;
  update: <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => void;
}
