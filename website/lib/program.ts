/**
 * Server-side facts about the home page program. Everything shown about it is
 * produced here by the real packages at build time: the plan by `planGraph`,
 * the output by the interpreter, the module by the compiler.
 */

import { compile } from '@hlang-org/compiler';
import type { CompileResult } from '@hlang-org/compiler';
import { interpret, NodeRegistry } from '@hlang-org/interpreter';
import { planGraph } from '@hlang-org/ir';
import type { ExecutionPlan } from '@hlang-org/ir';
import { BehaviorSubject } from 'rxjs';
import { liveGraph } from './live-graph';
import type { TransformCode } from './live-graph';
import { Flow, NODES, TRANSFORM_NODES } from './live-nodes';

export function compileProgram(code: TransformCode): CompileResult {
  return compile(liveGraph(code), {
    nodes: {
      'text-source': { from: './nodes/text-source.js' },
      [code]: { from: `./nodes/${code}.js` },
      print: { from: './nodes/print.js' },
    },
  });
}

export function planProgram(code: TransformCode): ExecutionPlan {
  return planGraph(liveGraph(code));
}

/** Run the program with the interpreter and return what the sink received. */
export function runProgram(code: TransformCode, text: string): readonly string[] {
  const received: string[] = [];
  const registry = new NodeRegistry()
    .register('text-source', NODES.source)
    .register(code, TRANSFORM_NODES[code])
    .register('print', NODES.print);
  const handle = interpret(
    liveGraph(code),
    { registry, createFlow: (options) => new Flow(options) },
    { middleware: { input$: new BehaviorSubject(text), emit: (value: string) => { received.push(value); } } },
  );
  handle.dispose();
  return received;
}
