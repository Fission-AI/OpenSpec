# todo-lite

A tiny in-memory todo list library.

```js
import { TodoList } from './src/todo.js';

const list = new TodoList();
const item = list.add('Buy milk');
list.complete(item.id);
list.items(); // [{ id: 1, title: 'Buy milk', done: true }]
```
