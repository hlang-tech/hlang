/**
 * Deep-freezes the plain data in a message (RFC 0001): objects whose
 * prototype is `Object.prototype` or `null`, and arrays. Messages are
 * immutable values that move without copying; freezing them makes a node
 * that mutates what it received fail at once, in its own handler.
 *
 * Typed arrays, buffers, maps, sets and class instances are left alone: they
 * cannot be frozen meaningfully (a frozen `Map` still accepts `set`), or they
 * carry state their class manages. The contract applies to them all the same.
 */

function isPlainData(value: object): boolean {
  if (Array.isArray(value)) {
    return true;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function deepFreeze(message: unknown): void {
  // A worklist rather than recursion: a message can nest deeply.
  const pending: unknown[] = [message];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== 'object' || value === null || Object.isFrozen(value) || !isPlainData(value)) {
      continue;
    }
    // Frozen before its children are visited, so a cycle ends here.
    Object.freeze(value);
    for (const child of Object.values(value)) {
      pending.push(child);
    }
  }
}
