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

export function resolveOutputFormat(options?: { jsonPretty?: boolean; toon?: boolean; json?: boolean }): OutputFormat | undefined {
  let format: OutputFormat | undefined;
  if (options?.jsonPretty) format = 'json-pretty';
  else if (options?.toon) format = 'toon';
  else if (options?.json) format = 'json';

  if (format && options) {
    options.json = true;
  }
  
  return format;
}

export function normalizeOptions<T extends { jsonPretty?: boolean; toon?: boolean; json?: boolean }>(
  options?: T
): (T extends undefined ? object : T) & { format?: OutputFormat } {
  const opts = options ?? ({} as unknown as T);
  const format = resolveOutputFormat(opts);
  if (format) {
    opts.json = true;
  }
  return { ...opts, format } as any;
}
