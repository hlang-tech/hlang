import { compileProgram, planProgram, runProgram } from '@/lib/program';
import { liveGraph } from '@/lib/live-graph';
import { BackendsGrid } from '@/components/home/BackendsGrid';

const INPUT = 'Ports are live streams';

/**
 * One program, four states, all produced at build time by the real packages:
 * the IGraph, the plan from planGraph, the interpreter's output, and the first
 * lines of the module the compiler prints.
 */
export function Backends() {
  const graph = liveGraph('uppercase');
  const plan = planProgram('uppercase');
  const output = runProgram('uppercase', INPUT);
  const moduleLines = compileProgram('uppercase')
    .code.split('\n')
    .filter(line => line.length > 0)
    .slice(1, 7);

  return (
    <BackendsGrid
      heading="One program, two backends"
      lead="planGraph checks a graph and plans it once. The interpreter runs that plan; the compiler prints the same plan as a module."
      fields={[
        {
          clause: 'First it is data: an IGraph.',
          tone: 'bg-surface',
          title: 'IGraph',
          body: (
            <>
              {graph.nodeList.map(node => (
                <span key={node.nodeId} className="block">
                  {node.nodeId} <span className="text-silver-lo">· {node.type} · {node.code}</span>
                </span>
              ))}
              <span className="mt-1 block text-silver-lo">{graph.connections.length} connections</span>
            </>
          ),
        },
        {
          clause: 'Then planGraph checks and plans it.',
          tone: 'bg-surface-2',
          title: 'ExecutionPlan',
          body: (
            <>
              <span className="block">roots: {plan.roots.join(', ')}</span>
              {plan.connections.map(connection => (
                <span className="block" key={`${connection.source.nodeId}-${connection.target.nodeId}`}>
                  {connection.source.nodeId}.{connection.source.portId} → {connection.target.nodeId}.{connection.target.portId}
                </span>
              ))}
            </>
          ),
        },
        {
          clause: 'The interpreter runs it in process.',
          tone: 'bg-surface-3',
          title: 'interpret()',
          body: (
            <>
              <span className="block text-silver-lo">in · {INPUT}</span>
              {output.map(value => (
                <span key={value} className="block text-ink">
                  out · {value}
                </span>
              ))}
            </>
          ),
        },
        {
          clause: 'Or the compiler prints it as a module.',
          tone: 'bg-silver text-ground',
          title: 'compile()',
          body: moduleLines.map(line => (
            <span key={line} className="block truncate">
              {line}
            </span>
          )),
        },
      ]}
    />
  );
}
