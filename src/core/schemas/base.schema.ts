import { z } from 'zod';
import { VALIDATION_MESSAGES } from '../validation/constants.js';
import { buildKeywordRegex, formatKeywordMessage, resolveKeywords } from '../i18n/keywords.js';

export const ScenarioSchema = z.object({
  rawText: z.string().min(1, VALIDATION_MESSAGES.SCENARIO_EMPTY),
});

/**
 * Create a RequirementSchema configured for the given language's normative keywords.
 */
export function createRequirementSchema(language?: string) {
  const keywords = resolveKeywords(language);
  const regex = buildKeywordRegex(keywords);
  const message = formatKeywordMessage(keywords);

  return z.object({
    text: z.string()
      .min(1, VALIDATION_MESSAGES.REQUIREMENT_EMPTY)
      .refine(
        (text) => regex.test(text),
        message
      ),
    scenarios: z.array(ScenarioSchema)
      .min(1, VALIDATION_MESSAGES.REQUIREMENT_NO_SCENARIOS),
  });
}

// Default English schema for backward compatibility
export const RequirementSchema = createRequirementSchema('en');

export type Scenario = z.infer<typeof ScenarioSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
