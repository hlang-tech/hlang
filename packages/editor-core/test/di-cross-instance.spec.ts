/**
 * Regression: service resolution must survive duplicate service-identifier
 * objects that share a name.
 *
 * When packages are linked (e.g. `file:`) a bundler can end up with more than
 * one instance of a service-identifier module, so a token imported by one
 * package is a DIFFERENT object than the same-named token used to register the
 * service inside the core. The `ServiceCollection` keys by `serviceName`, so
 * resolution still works. This test loads a second, real instance of the
 * identifier module to reproduce that duplication.
 */

import { describe, it, expect, vi } from 'vitest';
import { ServiceCollection, IIdGenerator, CountingIdGenerator } from '../src';

describe('ServiceCollection resolves across duplicate same-named identifiers', () => {
  it('a distinct token object with the same serviceName resolves the service', async () => {
    const collection = new ServiceCollection();
    collection.set(IIdGenerator, new CountingIdGenerator());

    // A second instance of the identifier module, as a second bundled copy of
    // the package would load: its `createDecorator` builds a distinct token
    // object under the same name.
    vi.resetModules();
    const secondInstance = await import('../src/di/decorator');
    const duplicateToken = secondInstance.createDecorator<{ nextEdgeId(): string }>('idGenerator');

    expect(duplicateToken).not.toBe(IIdGenerator);
    expect(duplicateToken.serviceName).toBe(IIdGenerator.serviceName);

    // Resolution via the distinct token must still find the registered service.
    const resolved = collection.get(duplicateToken);
    expect(typeof resolved.nextEdgeId()).toBe('string');
  });
});
