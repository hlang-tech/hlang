/**
 * Shared by the fixture nodes: reading their params, and reporting to the
 * host. Fixtures run in both backends, in this process (the interpreter) and in
 * a child process (the compiled program), so they are plain ES modules that
 * Node.js runs as they are (it strips their types).
 */
import type { INodeConstructionOptions } from '@hlang-org/interpreter';

/** What a sink reports: the node that received a value, and the value. */
export interface SinkEntry {
  readonly nodeId: string;
  readonly value: unknown;
}

/** Receives what sinks report; a host passes it as the `record` middleware. */
export type Recorder = (entry: SinkEntry) => void;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecorder(value: unknown): value is Recorder {
  return typeof value === 'function';
}

/** The node's params, or none. */
export function paramsOf(opts: INodeConstructionOptions): Readonly<Record<string, unknown>> {
  const { params } = opts.config;
  return isRecord(params) ? params : {};
}

/** The host's `record` middleware, or one that keeps nothing when the host passes none. */
export function recorderOf(opts: INodeConstructionOptions): Recorder {
  const { record } = opts.middleware;
  return isRecorder(record) ? record : () => undefined;
}
