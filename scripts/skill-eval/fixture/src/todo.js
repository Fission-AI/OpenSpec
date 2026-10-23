export class TodoList {
  #items = [];
  #nextId = 1;

  add(title) {
    const trimmed = String(title ?? '').trim();
    if (trimmed === '') {
      throw new Error('title is required');
    }
    const item = { id: this.#nextId++, title: trimmed, done: false };
    this.#items.push(item);
    return { ...item };
  }

  complete(id) {
    const item = this.#items.find((entry) => entry.id === id);
    if (!item) {
      throw new Error(`no todo with id ${id}`);
    }
    item.done = true;
    return { ...item };
  }

  items() {
    return this.#items.map((item) => ({ ...item }));
  }
}
