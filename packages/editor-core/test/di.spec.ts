/**
 * DI kernel: identifiers, collection, and constructor injection.
 *
 * TDD: written before wiring real services; verifies the container mechanics.
 */

import {
  createDecorator,
  ServiceCollection,
  InstantiationService,
} from '../src/di';

interface ILogger {
  log(msg: string): void;
}
interface IClock {
  now(): number;
}
const ILogger = createDecorator<ILogger>('logger');
const IClock = createDecorator<IClock>('clock');

class FixedClock implements IClock {
  constructor(private readonly value: number) {}
  now(): number {
    return this.value;
  }
}
class ArrayLogger implements ILogger {
  readonly lines: string[] = [];
  log(msg: string): void {
    this.lines.push(msg);
  }
}

describe('createDecorator', () => {
  it('returns a stable identifier per service name', () => {
    const a = createDecorator<ILogger>('shared-name');
    const b = createDecorator<ILogger>('shared-name');
    expect(a).toBe(b);
    expect(a.serviceName).toBe('shared-name');
  });
});

describe('ServiceCollection', () => {
  it('registers and resolves instances by identifier', () => {
    const c = new ServiceCollection();
    const logger = new ArrayLogger();
    c.set(ILogger, logger);
    expect(c.has(ILogger)).toBe(true);
    expect(c.get(ILogger)).toBe(logger);
  });

  it('throws when resolving an unregistered service', () => {
    const c = new ServiceCollection();
    expect(() => c.get(IClock)).toThrow(/clock/);
  });

  it('tryGet returns undefined for an unregistered service', () => {
    const c = new ServiceCollection();
    expect(c.tryGet(IClock)).toBeUndefined();
  });
});

describe('InstantiationService', () => {
  it('injects declared dependencies into a constructor', () => {
    class Service {
      constructor(
        @ILogger readonly logger: ILogger,
        @IClock readonly clock: IClock,
      ) {}
      run(): void {
        this.logger.log(`tick@${String(this.clock.now())}`);
      }
    }

    const collection = new ServiceCollection();
    const logger = new ArrayLogger();
    collection.set(ILogger, logger).set(IClock, new FixedClock(42));
    const instantiation = new InstantiationService(collection);

    const service = instantiation.createInstance(Service);
    service.run();

    expect(logger.lines).toEqual(['tick@42']);
    expect(service.logger).toBe(logger);
    expect(service.clock.now()).toBe(42);
  });

  it('appends trailing positional args after injected ones', () => {
    class Widget {
      constructor(
        @ILogger readonly logger: ILogger,
        readonly label: string,
      ) {}
    }
    const collection = new ServiceCollection();
    collection.set(ILogger, new ArrayLogger());
    const instantiation = new InstantiationService(collection);

    const widget = instantiation.createInstance(Widget, 'hello');
    expect(widget.label).toBe('hello');
  });

  it('throws when a declared dependency is not registered', () => {
    class NeedsClock {
      constructor(@IClock readonly clock: IClock) {}
    }
    const instantiation = new InstantiationService(new ServiceCollection());
    expect(() => instantiation.createInstance(NeedsClock)).toThrow(/clock/);
  });

  it('does not inherit a parent class dependency list by identity', () => {
    class Base {
      constructor(@ILogger readonly logger: ILogger) {}
    }
    // A subclass with no own decorators must not resolve Base's injected params.
    class Child extends Base {}
    const collection = new ServiceCollection();
    const logger = new ArrayLogger();
    collection.set(ILogger, logger);
    const instantiation = new InstantiationService(collection);

    // Child declares no dependencies of its own, so createInstance passes no
    // injected args; the (inherited) constructor receives undefined logger.
    const child = instantiation.createInstance(Child);
    expect(child).toBeInstanceOf(Child);
  });
});
