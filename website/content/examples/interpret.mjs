import { Flow } from '@hlang-org/runtime';
import { interpret, NodeRegistry } from '@hlang-org/interpreter';
import { Greeting, Uppercase, Print } from './lib/nodes.mjs';
import { graph } from './lib/graph.mjs';

// The registry maps each node `code` in the graph to a node class.
const registry = new NodeRegistry()
  .register('greeting', Greeting)
  .register('uppercase', Uppercase)
  .register('print', Print);

const handle = interpret(graph, { registry, createFlow: (options) => new Flow(options) });
handle.onError(({ nodeId, error }) => console.error(nodeId, error));

// Stop every node and release its subscriptions.
handle.dispose();
