/**
 * `InstantiationService` — constructs classes, injecting their declared
 * service dependencies from a `ServiceCollection`.
 *
 * A class declares dependencies via parameter decorators (the service
 * identifiers). At construction time we read that metadata, resolve each
 * dependency from the collection, and place it at the correct parameter index.
 * Injected parameters conventionally come first; any trailing positional
 * arguments passed to `createInstance` follow them.
 */

import { getServiceDependencies } from './decorator';
import type { ServiceCollection } from './service-collection';
import type { Newable, ServiceIdentifier } from './types';

export class InstantiationService {
  constructor(private readonly services: ServiceCollection) {}

  /** Resolve a service directly from the backing collection. */
  get<T>(id: ServiceIdentifier<T>): T {
    return this.services.get(id);
  }

  /**
   * Instantiate `ctor`, injecting decorated dependencies and appending any
   * `rest` positional arguments after the injected ones.
   *
   * @throws if a declared dependency is not registered, or if the decorated
   * parameter indices are not the leading, contiguous parameters.
   */
  createInstance<T>(ctor: Newable<T>, ...rest: readonly unknown[]): T {
    const dependencies = getServiceDependencies(ctor)
      .slice()
      .sort((a, b) => a.index - b.index);

    // Injected params must be the leading contiguous parameters [0..n).
    dependencies.forEach((dep, i) => {
      if (dep.index !== i) {
        throw new Error(
          `InstantiationService: "${ctor.name}" has a non-leading injected ` +
            `parameter at index ${String(dep.index)}; injected parameters must ` +
            `be the first constructor parameters.`,
        );
      }
    });

    const injected = dependencies.map(dep => this.services.get(dep.id));
    // A constructor's parameter types are not known here, only the services its
    // decorators name, so the arguments are passed unchecked. Each injected
    // argument is the instance registered for the identifier on that parameter.
    const args = [...injected, ...rest] as never[];
    return new ctor(...args);
  }
}
