/**
 * Property tests: planGraph checked against an independent statement of the
 * rules, over randomly generated graphs that are often invalid.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ERROR_PORT_NAME, GraphError, planGraph } from '../src';
import type { IConnection, IGraph, INodeInfo, NodeKind } from '../src';

const KINDS: readonly NodeKind[] = ['R', 'T', 'W'];
/** A small id space, so graphs repeat ids and reference missing nodes. */
const nodeId = fc.constantFrom('a', 'b', 'c', 'd', 'e');
const portId = fc.constantFrom('Output', 'Input', 'x', ERROR_PORT_NAME);

const node: fc.Arbitrary<INodeInfo> = fc.record({
  nodeId,
  kind: fc.constantFrom(...KINDS),
}).map(({ nodeId: id, kind }) => ({ nodeId: id, code: 'c', name: id, type: kind, bizData: { params: {} } }));

/** An endpoint, sometimes without a port, which planGraph then defaults. */
const endpoint = fc.record({ nodeId, port: fc.option(portId, { nil: undefined }) }).map(({ nodeId: id, port }) =>
  port === undefined ? { nodeId: id } : { nodeId: id, portConf: { id: port } },
);

const connection: fc.Arbitrary<IConnection> = fc
  .record({ from: endpoint, to: endpoint })
  .map(({ from, to }) => ({ Output: from, Input: to }));

const graph: fc.Arbitrary<IGraph> = fc.record({
  nodeList: fc.array(node, { maxLength: 6 }),
  connections: fc.array(connection, { maxLength: 8 }),
});

/** hlang's graph rules, stated independently of planGraph. */
function isValid(input: IGraph): boolean {
  const ids = input.nodeList.map((info) => info.nodeId);
  if (new Set(ids).size !== ids.length) return false;
  const kindOf = new Map(input.nodeList.map((info) => [info.nodeId, info.type]));
  const connectionsValid = input.connections.every(({ Output, Input }) => {
    const source = kindOf.get(Output.nodeId);
    const target = kindOf.get(Input.nodeId);
    return (
      source !== undefined &&
      target !== undefined &&
      source !== 'W' &&
      target !== 'R' &&
      (Input.portConf?.id ?? 'Input') !== ERROR_PORT_NAME
    );
  });
  return connectionsValid && input.nodeList.some((info) => info.type === 'R');
}

describe('planGraph (properties)', () => {
  it('plans exactly the graphs that follow the rules, and fails the others with a GraphError', () => {
    fc.assert(
      fc.property(graph, (input) => {
        let planned: ReturnType<typeof planGraph> | undefined;
        let failure: unknown;
        try {
          planned = planGraph(input);
        } catch (error: unknown) {
          failure = error;
        }
        expect(planned !== undefined).toBe(isValid(input));
        if (planned === undefined) {
          expect(failure).toBeInstanceOf(GraphError);
          return;
        }
        expect(planned.nodes.map((info) => info.nodeId)).toEqual(input.nodeList.map((info) => info.nodeId));
        expect(planned.roots).toEqual(input.nodeList.filter((info) => info.type === 'R').map((info) => info.nodeId));
        expect(planned.connections).toHaveLength(input.connections.length);
      }),
      { numRuns: 2000 },
    );
  });
});
