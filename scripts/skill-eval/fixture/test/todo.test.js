import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TodoList } from '../src/todo.js';

test('add returns the new item', () => {
  const list = new TodoList();
  assert.deepEqual(list.add('  Buy milk '), { id: 1, title: 'Buy milk', done: false });
});

test('add rejects an empty title', () => {
  const list = new TodoList();
  assert.throws(() => list.add('   '), /title is required/);
});

test('complete marks an item done', () => {
  const list = new TodoList();
  const item = list.add('Buy milk');
  assert.equal(list.complete(item.id).done, true);
  assert.equal(list.items()[0].done, true);
});

test('complete rejects an unknown id', () => {
  const list = new TodoList();
  assert.throws(() => list.complete(42), /no todo with id 42/);
});
