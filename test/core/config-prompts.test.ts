import { describe, expect, it } from 'vitest';

import { serializeConfig } from '../../src/core/config-prompts.js';

describe('config prompts', () => {
  it('guides agents toward context they cannot infer from the codebase', () => {
    const config = serializeConfig({ schema: 'spec-driven' });

    expect(config).toContain('details that should shape how OpenSpec artifacts are written');
    expect(config).toContain('constraints an agent cannot infer by reading the code');
    expect(config).toContain('Keep general project documentation and discoverable codebase facts out');
    expect(config).toContain('Designs and tasks must cover Windows, macOS, and Linux');
    expect(config).toContain('Write all artifacts in Spanish');
    expect(config).not.toContain('Add your tech stack');
    expect(config).not.toContain('Domain: e-commerce platform');
  });
});
