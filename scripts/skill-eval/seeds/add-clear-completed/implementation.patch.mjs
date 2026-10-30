// Applies the finished add-clear-completed implementation to a fixture copy.
import fs from 'node:fs';
import path from 'node:path';

export function applyClearCompleted(root) {
  const src = path.join(root, 'src', 'todo.js');
  fs.writeFileSync(
    src,
    fs.readFileSync(src, 'utf8').replace(
      '  items() {',
      `  clearCompleted() {
    const before = this.#items.length;
    this.#items = this.#items.filter((item) => !item.done);
    return before - this.#items.length;
  }

  items() {`
    )
  );
  fs.appendFileSync(
    path.join(root, 'test', 'todo.test.js'),
    `
test('clearCompleted removes done items', () => {
  const list = new TodoList();
  const a = list.add('a');
  const b = list.add('b');
  list.add('c');
  list.complete(a.id);
  list.complete(b.id);
  assert.equal(list.clearCompleted(), 2);
  assert.deepEqual(list.items().map((item) => item.title), ['c']);
});

test('clearCompleted with nothing done returns 0', () => {
  const list = new TodoList();
  list.add('a');
  assert.equal(list.clearCompleted(), 0);
  assert.equal(list.items().length, 1);
});
`
  );
}
