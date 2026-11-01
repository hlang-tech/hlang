import { planGraph, GraphError } from '@hlang-org/ir';
import { graph } from './lib/graph.mjs';

// planGraph checks a graph once and returns the plan both backends use.
const plan = planGraph(graph);
console.log('roots:', plan.roots.join(', '));
for (const { source, target } of plan.connections) {
  console.log(`${source.nodeId}.${source.portId} -> ${target.nodeId}.${target.portId}`);
}

// A Writable has no output port, so a connection from it is refused.
const reversed = {
  ...graph,
  connections: [{ Output: { nodeId: 'c', portConf: { id: 'in' } }, Input: { nodeId: 'a', portConf: { id: 'out' } } }],
};
try {
  planGraph(reversed);
} catch (error) {
  if (error instanceof GraphError) {
    console.log(`${error.code}: ${error.message}`);
  } else {
    throw error;
  }
}
