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

/**
 * The dependencies recorded on one constructor. They are kept as an own static
 * property (not a module-level map) so that a second copy of this module, as a
 * second bundled instance of the package produces, reads the same record.
 */
interface DependencyRecord {
  readonly ctor: unknown;
  readonly deps: IServiceDependency[];
}

/** Registry of created identifiers, keyed by service name (guards duplicates). */
const identifiers = new Set<string>();

function isServiceIdentifier(value: unknown): value is ServiceIdentifier<unknown> {
  return typeof value === 'function' && 'serviceName' in value && typeof value.serviceName === 'string';
}

function isDependency(value: unknown): value is IServiceDependency {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    isServiceIdentifier(value.id) &&
    'index' in value &&
    typeof value.index === 'number'
  );
}

function isDependencyRecord(value: unknown): value is DependencyRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ctor' in value &&
    'deps' in value &&
    Array.isArray(value.deps) &&
    value.deps.every(isDependency)
  );
}

/** The record declared on `target` itself, if any; a parent's record is not inherited. */
function ownRecord(target: object): DependencyRecord | undefined {
  const record: unknown = Object.getOwnPropertyDescriptor(target, DEPENDENCIES_KEY)?.value;
  return isDependencyRecord(record) && record.ctor === target ? record : undefined;
}

/**
 * Read the ordered dependency list declared on a constructor via decorators.
 * Returns an empty array when the constructor declares no injected params.
 */
export function getServiceDependencies(ctor: unknown): readonly IServiceDependency[] {
  if (typeof ctor !== 'function') {
    return [];
  }
  return ownRecord(ctor)?.deps ?? [];
}

function storeServiceDependency(id: ServiceIdentifier<unknown>, target: object, index: number): void {
  const existing = ownRecord(target);
  if (existing !== undefined) {
    existing.deps.push({ id, index });
    return;
  }
  const record: DependencyRecord = { ctor: target, deps: [{ id, index }] };
  Object.defineProperty(target, DEPENDENCIES_KEY, {
    value: record,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

/**
 * Create a new service identifier. The returned value is both a token (for
 * registration/resolution) and a parameter decorator (for dependency
 * declaration). A service name is created once per module instance; creating
 * it again is a programming error and throws.
 */
export function createDecorator<T>(serviceName: string): ServiceIdentifier<T> {
  if (identifiers.has(serviceName)) {
    throw new Error(`createDecorator: the service "${serviceName}" already has an identifier.`);
  }

  const decorate = (target: object, _propertyKey: string | undefined, parameterIndex: number): void => {
    storeServiceDependency(identifier, target, parameterIndex);
  };
  const identifier: ServiceIdentifier<T> = Object.assign(decorate, { serviceName });
  Object.defineProperty(identifier, 'toString', {
    value: () => serviceName,
    enumerable: false,
  });
  Object.freeze(identifier);

  identifiers.add(serviceName);
  return identifier;
}
