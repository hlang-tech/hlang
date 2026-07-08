/**
 * `createDecorator` — mint a service identifier that doubles as a parameter
 * decorator, and the metadata store the instantiation service reads.
 *
 * Dependencies are recorded on the target constructor under a non-enumerable
 * static property, keyed by the constructor itself, so subclasses do not
 * accidentally inherit a parent's dependency list.
 */

import type { IServiceDependency, ServiceIdentifier } from './types';

/** Static property key under which a constructor's dependencies are stored. */
const DEPENDENCIES_KEY = '$di$dependencies';

interface WithDependencies {
  [DEPENDENCIES_KEY]?: {
    readonly ctor: unknown;
    readonly deps: IServiceDependency[];
  };
}

/** Registry of created identifiers, keyed by service name (guards duplicates). */
const identifiers = new Map<string, ServiceIdentifier<unknown>>();

/**
 * Read the ordered dependency list declared on a constructor via decorators.
 * Returns an empty array when the constructor declares no injected params.
 */
export function getServiceDependencies(ctor: unknown): readonly IServiceDependency[] {
  const holder = ctor as WithDependencies;
  const record = holder[DEPENDENCIES_KEY];
  if (record === undefined || record.ctor !== ctor) {
    return [];
  }
  return record.deps;
}

function storeServiceDependency(
  id: ServiceIdentifier<unknown>,
  target: object,
  index: number,
): void {
  const holder = target as WithDependencies;
  const existing = holder[DEPENDENCIES_KEY];
  if (existing?.ctor === target) {
    existing.deps.push({ id, index });
    return;
  }
  Object.defineProperty(holder, DEPENDENCIES_KEY, {
    value: { ctor: target, deps: [{ id, index }] },
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

/**
 * Create a new service identifier. The returned value is both a token (for
 * registration/resolution) and a parameter decorator (for dependency
 * declaration). Service names must be unique.
 */
export function createDecorator<T>(serviceName: string): ServiceIdentifier<T> {
  const existing = identifiers.get(serviceName);
  if (existing !== undefined) {
    return existing as ServiceIdentifier<T>;
  }

  const identifier = function (
    target: object,
    _propertyKey: string | undefined,
    parameterIndex: number,
  ): void {
    storeServiceDependency(identifier, target, parameterIndex);
  } as ServiceIdentifier<T>;

  Object.defineProperty(identifier, 'serviceName', {
    value: serviceName,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(identifier, 'toString', {
    value: () => serviceName,
    enumerable: false,
  });

  identifiers.set(serviceName, identifier);
  return identifier;
}
