import { findRepoPlanningRootSync } from '../planning-home.js';

export function resolveSchemaConsumerRoot(startPath: string): string | null {
  return findRepoPlanningRootSync(startPath);
}
