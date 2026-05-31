interface Node<K, V> {
  key: K;
  next: Node<K, V> | null;
  prev: Node<K, V> | null;
  value: V;
}

export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, Node<K, V>>;
  private head: Node<K, V> | null;
  private tail: Node<K, V> | null;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("LRUCache capacity must be greater than 0");
    }
    this.capacity = capacity;
    this.map = new Map();
    this.head = null;
    this.tail = null;
  }

  get size(): number {
    return this.map.size;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      return;
    }
    this.moveToHead(node);
    return node.value;
  }

  peek(key: K): V | undefined {
    return this.map.get(key)?.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);

    if (this.map.size > this.capacity) {
      this.evictTail();
    }
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) {
      return false;
    }
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  *entries(): IterableIterator<[K, V]> {
    let node = this.head;
    while (node) {
      yield [node.key, node.value];
      node = node.next;
    }
  }

  private addToHead(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: Node<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: Node<K, V>): void {
    if (this.head === node) {
      return;
    }
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictTail(): void {
    if (!this.tail) {
      return;
    }
    const evicted = this.tail;
    this.removeNode(evicted);
    this.map.delete(evicted.key);
  }
}
