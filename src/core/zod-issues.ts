import type { z } from 'zod';

/** One rendering for zod issues across every state/config parser. */
export function formatZodIssues(
  error: z.ZodError,
  fallbackLocation = 'root'
): string {
  return error.issues
    .map((issue) => {
      const location =
        issue.path.length > 0 ? issue.path.join('.') : fallbackLocation;
      return `${location}: ${issue.message}`;
    })
    .join('; ');
}
