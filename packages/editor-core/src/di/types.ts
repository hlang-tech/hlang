/**
 * Dependency-injection primitives, modeled on VSCode's lightweight DI.
 *
 * A `ServiceIdentifier<T>` is a branded token that is simultaneously:
 *   - a value (used to register/resolve a service in a `ServiceCollection`), and
 *   - a TypeScript parameter decorator (used to declare a constructor
 *     dependency, e.g. `constructor(@IGraphModel model: IGraphModel)`).
 *
 * This gives compile-time-safe, zero-runtime-dependency injection: no
 * `reflect-metadata`, no container library. The identifier carries its service
 * type in a phantom field so `collection.get(id)` returns the right type.
 */

/** Records one injected dependency on a target constructor. */
export interface IServiceDependency {
  /** The service identifier to inject. */
  readonly id: ServiceIdentifier<unknown>;
  /** Position of the decorated constructor parameter. */
  readonly index: number;
}

/**
 * A service token. Callable as a parameter decorator; carries the service type
 * `T` for type-safe resolution. The `type` phantom is never read at runtime.
 */
export interface ServiceIdentifier<T> {
  (target: object, propertyKey: string | undefined, parameterIndex: number): void;
  /** Phantom marker for the service type: never set, only inferred from. */
  readonly type?: T;
  /** Unique service name (for diagnostics and identity). */
  readonly serviceName: string;
}

/**
 * A constructor that the instantiation service can build. Its declared
 * dependencies are read from the static metadata attached by decorators.
 */
export type Newable<T> = new (...args: never[]) => T;
