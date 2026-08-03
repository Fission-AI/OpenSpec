import * as toon from '@toon-format/toon';

export type OutputFormat = 'json' | 'json-pretty' | 'toon';

export function formatAgentOutput(payload: unknown, format: OutputFormat): string {
  if (format === 'toon') {
    try {
      return toon.encode(payload);
    } catch (error) {
      // Fallback to minified JSON if TOON serialization fails
      return JSON.stringify(payload);
    }
  } else if (format === 'json-pretty') {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}
