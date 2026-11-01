/**
 * @hlang-org/compiler
 *
 * Ahead-of-time compiler for hlang. `compile` lowers an `IGraph` through the
 * shared front end (`planGraph` from `@hlang-org/ir`), builds an ESTree
 * program, and prints it as a standalone ES module.
 */

export { compile } from './compile';
export type { CompileOptions, CompileResult, NodeImport } from './compile';
export { CompileError } from './errors';
export type { CompileErrorCode } from './errors';

// Graph validation errors come from the shared front end.
export { GraphError } from '@hlang-org/ir';
export type { GraphErrorCode, IGraph } from '@hlang-org/ir';
