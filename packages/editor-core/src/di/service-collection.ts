/**
 * `ServiceCollection` — a typed map from service identifier to instance.
 *
 * Services are registered as already-constructed singletons. Entries are keyed
 * by the identifier's `serviceName` (a string), NOT by the token object's
 * reference. This is deliberate: when packages are linked (e.g. via `file:`)
 * and a bundler ends up with more than one instance of a service-identifier
 * module, two same-named tokens can be distinct objects. Keying by name keeps
 * resolution correct across such duplication — the same approach VSCode's DI
 * uses. Service names are unique by construction (`createDecorator` enforces
 * one identifier per name within a module instance).
 */

import type { ServiceIdentifier } from './types';

export class ServiceCollection {
  private readonly entries = new Map<string, unknown>();

  /** Register (or replace) the instance bound to `id`. */
  set<T>(id: ServiceIdentifier<T>, instance: T): this {
    this.entries.set(id.serviceName, instance);
    return this;
  }

  /** Whether an instance is bound to `id`. */
  has(id: ServiceIdentifier<unknown>): boolean {
    return this.entries.has(id.serviceName);
  }

  /**
   * Resolve the instance bound to `id`.
   * @throws if no instance is registered.
   */
  get<T>(id: ServiceIdentifier<T>): T {
    const instance = this.entries.get(id.serviceName);
    if (instance === undefined) {
      throw new Error(`ServiceCollection: no service registered for "${id.serviceName}".`);
    }
    return instance as T;
  }

  /** Resolve the instance bound to `id`, or `undefined` if unregistered. */
  tryGet<T>(id: ServiceIdentifier<T>): T | undefined {
    return this.entries.get(id.serviceName) as T | undefined;
  }
}
