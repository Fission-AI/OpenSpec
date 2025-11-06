import { select } from '@inquirer/prompts';
import ora from 'ora';
import path from 'path';
import { Validator } from '../core/validation/validator.js';
import { isInteractive } from '../utils/interactive.js';
import { getActiveChangeIds, getSpecIds } from '../utils/item-discovery.js';
import { nearestMatches } from '../utils/match.js';
export class ValidateCommand {
    async execute(itemName, options = {}) {
        const interactive = isInteractive(options.noInteractive);
        // Handle bulk flags first
        if (options.all || options.changes || options.specs) {
            await this.runBulkValidation({
                changes: !!options.all || !!options.changes,
                specs: !!options.all || !!options.specs,
            }, { strict: !!options.strict, json: !!options.json, concurrency: options.concurrency });
            return;
        }
        // No item and no flags
        if (!itemName) {
            if (interactive) {
                await this.runInteractiveSelector({ strict: !!options.strict, json: !!options.json, concurrency: options.concurrency });
                return;
            }
            this.printNonInteractiveHint();
            process.exitCode = 1;
            return;
        }
        // Direct item validation with type detection or override
        const typeOverride = this.normalizeType(options.type);
        await this.validateDirectItem(itemName, { typeOverride, strict: !!options.strict, json: !!options.json });
    }
    normalizeType(value) {
        if (!value)
            return undefined;
        const v = value.toLowerCase();
        if (v === 'change' || v === 'spec')
            return v;
        return undefined;
    }
    async runInteractiveSelector(opts) {
        const choice = await select({
            message: 'What would you like to validate?',
            choices: [
                { name: 'All (changes + specs)', value: 'all' },
                { name: 'All changes', value: 'changes' },
                { name: 'All specs', value: 'specs' },
                { name: 'Pick a specific change or spec', value: 'one' },
            ],
        });
        if (choice === 'all')
            return this.runBulkValidation({ changes: true, specs: true }, opts);
        if (choice === 'changes')
            return this.runBulkValidation({ changes: true, specs: false }, opts);
        if (choice === 'specs')
            return this.runBulkValidation({ changes: false, specs: true }, opts);
        // one
        const [changes, specs] = await Promise.all([getActiveChangeIds(), getSpecIds()]);
        const items = [];
        items.push(...changes.map(id => ({ name: `change/${id}`, value: { type: 'change', id } })));
        items.push(...specs.map(id => ({ name: `spec/${id}`, value: { type: 'spec', id } })));
        if (items.length === 0) {
            console.error('No items found to validate.');
            process.exitCode = 1;
            return;
        }
        const picked = await select({ message: 'Pick an item', choices: items });
        await this.validateByType(picked.type, picked.id, opts);
    }
    printNonInteractiveHint() {
        console.error('Nothing to validate. Try one of:');
        console.error('  openspec validate --all');
        console.error('  openspec validate --changes');
        console.error('  openspec validate --specs');
        console.error('  openspec validate <item-name>');
        console.error('Or run in an interactive terminal.');
    }
    async validateDirectItem(itemName, opts) {
        const [changes, specs] = await Promise.all([getActiveChangeIds(), getSpecIds()]);
        const isChange = changes.includes(itemName);
        const isSpec = specs.includes(itemName);
        const type = opts.typeOverride ?? (isChange ? 'change' : isSpec ? 'spec' : undefined);
        if (!type) {
            console.error(`Unknown item '${itemName}'`);
            const suggestions = nearestMatches(itemName, [...changes, ...specs]);
            if (suggestions.length)
                console.error(`Did you mean: ${suggestions.join(', ')}?`);
            process.exitCode = 1;
            return;
        }
        if (!opts.typeOverride && isChange && isSpec) {
            console.error(`Ambiguous item '${itemName}' matches both a change and a spec.`);
            console.error('Pass --type change|spec, or use: openspec change validate / openspec spec validate');
            process.exitCode = 1;
            return;
        }
        await this.validateByType(type, itemName, opts);
    }
    async validateByType(type, id, opts) {
        const validator = new Validator(opts.strict);
        if (type === 'change') {
            const changeDir = path.join(process.cwd(), 'openspec', 'changes', id);
            const start = Date.now();
            const report = await validator.validateChangeDeltaSpecs(changeDir);
            const durationMs = Date.now() - start;
            this.printReport('change', id, report, durationMs, opts.json);
            // Non-zero exit if invalid (keeps enriched output test semantics)
            process.exitCode = report.valid ? 0 : 1;
            return;
        }
        const file = path.join(process.cwd(), 'openspec', 'specs', id, 'spec.md');
        const start = Date.now();
        const report = await validator.validateSpec(file);
        const durationMs = Date.now() - start;
        this.printReport('spec', id, report, durationMs, opts.json);
        process.exitCode = report.valid ? 0 : 1;
    }
    printReport(type, id, report, durationMs, json) {
        if (json) {
            const out = { items: [{ id, type, valid: report.valid, issues: report.issues, durationMs }], summary: { totals: { items: 1, passed: report.valid ? 1 : 0, failed: report.valid ? 0 : 1 }, byType: { [type]: { items: 1, passed: report.valid ? 1 : 0, failed: report.valid ? 0 : 1 } } }, version: '1.0' };
            console.log(JSON.stringify(out, null, 2));
            return;
        }
        if (report.valid) {
            console.log(`${type === 'change' ? 'Change' : 'Specification'} '${id}' is valid`);
        }
        else {
            console.error(`${type === 'change' ? 'Change' : 'Specification'} '${id}' has issues`);
            for (const issue of report.issues) {
                const label = issue.level === 'ERROR' ? 'ERROR' : issue.level;
                const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
                console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
            }
            this.printNextSteps(type);
        }
    }
    printNextSteps(type) {
        const bullets = [];
        if (type === 'change') {
            bullets.push('- Ensure change has deltas in specs/: use headers ## ADDED/MODIFIED/REMOVED/RENAMED Requirements');
            bullets.push('- Each requirement MUST include at least one #### Scenario: block');
            bullets.push('- Debug parsed deltas: openspec change show <id> --json --deltas-only');
        }
        else {
            bullets.push('- Ensure spec includes ## Purpose and ## Requirements sections');
            bullets.push('- Each requirement MUST include at least one #### Scenario: block');
            bullets.push('- Re-run with --json to see structured report');
        }
        console.error('Next steps:');
        bullets.forEach(b => console.error(`  ${b}`));
    }
    async runBulkValidation(scope, opts) {
        const spinner = !opts.json ? ora('Validating...').start() : undefined;
        const [changeIds, specIds] = await Promise.all([
            scope.changes ? getActiveChangeIds() : Promise.resolve([]),
            scope.specs ? getSpecIds() : Promise.resolve([]),
        ]);
        const DEFAULT_CONCURRENCY = 6;
        const maxSuggestions = 5; // used by nearestMatches
        const concurrency = normalizeConcurrency(opts.concurrency) ?? normalizeConcurrency(process.env.OPENSPEC_CONCURRENCY) ?? DEFAULT_CONCURRENCY;
        const validator = new Validator(opts.strict);
        const queue = [];
        for (const id of changeIds) {
            queue.push(async () => {
                const start = Date.now();
                const changeDir = path.join(process.cwd(), 'openspec', 'changes', id);
                const report = await validator.validateChangeDeltaSpecs(changeDir);
                const durationMs = Date.now() - start;
                return { id, type: 'change', valid: report.valid, issues: report.issues, durationMs };
            });
        }
        for (const id of specIds) {
            queue.push(async () => {
                const start = Date.now();
                const file = path.join(process.cwd(), 'openspec', 'specs', id, 'spec.md');
                const report = await validator.validateSpec(file);
                const durationMs = Date.now() - start;
                return { id, type: 'spec', valid: report.valid, issues: report.issues, durationMs };
            });
        }
        const results = [];
        let index = 0;
        let running = 0;
        let passed = 0;
        let failed = 0;
        await new Promise((resolve) => {
            const next = () => {
                while (running < concurrency && index < queue.length) {
                    const currentIndex = index++;
                    const task = queue[currentIndex];
                    running++;
                    if (spinner)
                        spinner.text = `Validating (${currentIndex + 1}/${queue.length})...`;
                    task()
                        .then(res => {
                        results.push(res);
                        if (res.valid)
                            passed++;
                        else
                            failed++;
                    })
                        .catch((error) => {
                        const message = error?.message || 'Unknown error';
                        const res = { id: getPlannedId(currentIndex, changeIds, specIds) ?? 'unknown', type: getPlannedType(currentIndex, changeIds, specIds) ?? 'change', valid: false, issues: [{ level: 'ERROR', path: 'file', message }], durationMs: 0 };
                        results.push(res);
                        failed++;
                    })
                        .finally(() => {
                        running--;
                        if (index >= queue.length && running === 0)
                            resolve();
                        else
                            next();
                    });
                }
            };
            next();
        });
        spinner?.stop();
        results.sort((a, b) => a.id.localeCompare(b.id));
        const summary = {
            totals: { items: results.length, passed, failed },
            byType: {
                ...(scope.changes ? { change: summarizeType(results, 'change') } : {}),
                ...(scope.specs ? { spec: summarizeType(results, 'spec') } : {}),
            },
        };
        if (opts.json) {
            const out = { items: results, summary, version: '1.0' };
            console.log(JSON.stringify(out, null, 2));
        }
        else {
            for (const res of results) {
                if (res.valid)
                    console.log(`✓ ${res.type}/${res.id}`);
                else
                    console.error(`✗ ${res.type}/${res.id}`);
            }
            console.log(`Totals: ${summary.totals.passed} passed, ${summary.totals.failed} failed (${summary.totals.items} items)`);
        }
        process.exitCode = failed > 0 ? 1 : 0;
    }
}
function summarizeType(results, type) {
    const filtered = results.filter(r => r.type === type);
    const items = filtered.length;
    const passed = filtered.filter(r => r.valid).length;
    const failed = items - passed;
    return { items, passed, failed };
}
function normalizeConcurrency(value) {
    if (!value)
        return undefined;
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0)
        return undefined;
    return n;
}
function getPlannedId(index, changeIds, specIds) {
    const totalChanges = changeIds.length;
    if (index < totalChanges)
        return changeIds[index];
    const specIndex = index - totalChanges;
    return specIds[specIndex];
}
function getPlannedType(index, changeIds, specIds) {
    const totalChanges = changeIds.length;
    if (index < totalChanges)
        return 'change';
    const specIndex = index - totalChanges;
    if (specIndex >= 0 && specIndex < specIds.length)
        return 'spec';
    return undefined;
}
//# sourceMappingURL=validate.js.map