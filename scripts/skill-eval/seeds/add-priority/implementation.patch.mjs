// Applies the finished add-priority implementation to a fixture copy.
import fs from 'node:fs';
import path from 'node:path';

export function applyPriority(root) {
  const src = path.join(root, 'src', 'todo.js');
  fs.writeFileSync(
    src,
    fs
      .readFileSync(src, 'utf8')
      .replace('export class TodoList {', "export const PRIORITIES = Object.freeze(['low', 'normal', 'high']);\n\nexport class TodoList {")
      .replace(
        "  add(title) {",
        `  add(title, { priority = 'normal' } = {}) {
    if (!PRIORITIES.includes(priority)) {
      throw new Error(\`priority must be one of: \${PRIORITIES.join(', ')}\`);
    }`
      )
      .replace('done: false };', 'done: false, priority };')
  );
  const testFile = path.join(root, 'test', 'todo.test.js');
  fs.writeFileSync(
    testFile,
    fs
      .readFileSync(testFile, 'utf8')
      .replace("{ id: 1, title: 'Buy milk', done: false }", "{ id: 1, title: 'Buy milk', done: false, priority: 'normal' }") +
      `
test('priority defaults to normal', () => {
  assert.equal(new TodoList().add('a').priority, 'normal');
});

test('an explicit priority is kept', () => {
  assert.equal(new TodoList().add('a', { priority: 'high' }).priority, 'high');
});

test('an unknown priority is rejected', () => {
  assert.throws(() => new TodoList().add('a', { priority: 'urgent' }), /low, normal, high/);
});
`
  );
  // Tick the change's tasks when it is seeded; a fixture without it has none.
  const tasks = path.join(root, 'openspec', 'changes', 'add-priority', 'tasks.md');
  let text;
  try {
    text = fs.readFileSync(tasks, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  fs.writeFileSync(tasks, text.replaceAll('- [ ]', '- [x]'));
}
