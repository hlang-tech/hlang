/** Machine-readable reasons `compile` rejects its input. */
export type CompileErrorCode = 'unresolved-node' | 'invalid-import' | 'unserializable-config';

/**
 * Thrown by `compile` for problems specific to code generation. Problems with
 * the graph itself surface as `GraphError` from `@hlang-org/ir`.
 */
export class CompileError extends Error {
  readonly code: CompileErrorCode;

  constructor(code: CompileErrorCode, message: string) {
    super(message);
    this.name = 'CompileError';
    this.code = code;
  }
}
