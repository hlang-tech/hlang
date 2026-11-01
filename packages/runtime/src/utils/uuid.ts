import { v4, validate } from 'uuid';

/** Hands out v4 UUIDs, never the same one twice in a process. */
class UUIDManager {
  readonly uuidSet = new Set<string>();

  create(): string {
    const id = v4();
    if (!this.validate(id)) {
      return this.create();
    }
    this.uuidSet.add(id);
    return id;
  }

  validate(value: string): boolean {
    if (!validate(value)) {
      console.warn(`uuid ${value} is invalid.`);
      return false;
    }
    if (this.uuidSet.has(value)) {
      console.warn(`${value} exists.`);
      return false;
    }
    return true;
  }

  delete(value: string): Set<string> {
    this.uuidSet.delete(value);
    return this.uuidSet;
  }
}

export default new UUIDManager();
