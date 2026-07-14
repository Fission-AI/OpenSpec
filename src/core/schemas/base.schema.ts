import { z } from 'zod';
import { VALIDATION_MESSAGES } from '../validation/constants.js';

export const ScenarioSchema = z.object({
  rawText: z.string().min(1, VALIDATION_MESSAGES.SCENARIO_EMPTY),
});

export const RequirementSchema = z.object({
  // SHALL/MUST body-keyword enforcement lives in the imperative validator
  // (Validator.applySpecRules), not here: the parser collapses the requirement
  // header into `text`, so a Zod refine on `text` cannot tell "keyword in header
  // only" from "keyword in body" and emits a misleading generic error. The
  // validator recovers the header and emits the targeted hint for both the
  // main-spec and change-delta paths (#1156).
  text: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIREMENT_EMPTY),
  scenarios: z.array(ScenarioSchema)
    .min(1, VALIDATION_MESSAGES.REQUIREMENT_NO_SCENARIOS),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
