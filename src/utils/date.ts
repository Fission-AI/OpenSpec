/**
 * Formats a date using the effective local time zone of the Node.js process.
 *
 * The result is locale-independent and suitable for date-only metadata and
 * path prefixes.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
