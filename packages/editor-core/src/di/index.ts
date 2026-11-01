/**
 * Lightweight dependency injection, modeled on VSCode's DI. Zero runtime deps.
 */

export { createDecorator, getServiceDependencies } from './decorator';
export { ServiceCollection } from './service-collection';
export { InstantiationService } from './instantiation-service';
export type { ServiceIdentifier, IServiceDependency, Newable } from './types';
