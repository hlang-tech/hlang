/**
 * Regression: service resolution must survive duplicate service-identifier
 * objects that share a name.
 *
 * When packages are linked (e.g. `file:`) a bundler can end up with more than
 * one instance of a service-identifier module, so a token imported by one
 * package is a DIFFERENT object than the same-named token used to register the
 * service inside the core. The `ServiceCollection` keys by `serviceName`, so
 * resolution still works. This test reproduces that duplication explicitly.
 */

import { describe, it, expect } from 'vitest';
import { ServiceCollection, IIdGenerator, CountingIdGenerator } from '../src';
import type { ServiceIdentifier } from '../src';

describe('ServiceCollection resolves across duplicate same-named identifiers', () => {
  it('a distinct token object with the same serviceName resolves the service', () => {
    const collection = new ServiceCollection();
    collection.set(IIdGenerator, new CountingIdGenerator());

    // A distinct token OBJECT that shares the registered name — this is what a
    // second bundled module instance produces. `createDecorator` dedupes by
    // name within one module, so we build the equivalent shape directly.
    const noop = (): void => undefined;
    const duplicateToken = Object.assign(noop, {
      serviceName: 'idGenerator',
      type: undefined,
    }) as unknown as ServiceIdentifier<{ nextEdgeId(): string }>;

    expect(duplicateToken).not.toBe(IIdGenerator);
    expect(duplicateToken.serviceName).toBe(IIdGenerator.serviceName);

    // Resolution via the distinct token must still find the registered service.
    const resolved = collection.get(duplicateToken);
    expect(typeof resolved.nextEdgeId()).toBe('string');
  });
});
