// Preloaded with `node --import` by test/cli-e2e/startup-modules.test.ts.
// Records the URL of every module the process loads (built-ins excluded) and
// writes them, one per line, to the file named by OPENSPEC_TEST_MODULE_LOG
// when the process exits.
import * as nodeModule from 'node:module';
import { appendFileSync, writeFileSync } from 'node:fs';

const logFile = process.env.OPENSPEC_TEST_MODULE_LOG;

if (logFile) {
  writeFileSync(logFile, '');
  if (typeof nodeModule.registerHooks === 'function') {
    // Node 22.15+/23.5+: synchronous, in-thread hooks that also see require().
    const loaded = [];
    nodeModule.registerHooks({
      load(url, context, nextLoad) {
        if (!url.startsWith('node:')) loaded.push(url);
        return nextLoad(url, context);
      },
    });
    process.on('exit', () => appendFileSync(logFile, loaded.join('\n')));
  } else {
    // Node 20: asynchronous hooks on the loader thread. They see every module
    // reached through `import`, which covers the CLI's own (ESM) modules and
    // the entry module of every package it imports.
    const hooks = `
      import { appendFileSync } from 'node:fs';
      export async function load(url, context, nextLoad) {
        if (!url.startsWith('node:')) appendFileSync(${JSON.stringify(logFile)}, url + '\\n');
        return nextLoad(url, context);
      }
    `;
    nodeModule.register(`data:text/javascript,${encodeURIComponent(hooks)}`);
  }
}
