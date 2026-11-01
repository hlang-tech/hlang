'use client';

/**
 * The live graph: a real hlang program running in the visitor's browser.
 * Three nodes (Readable → Transform → Writable) built on @hlang-org/runtime,
 * run by @hlang-org/interpreter. Pulses on the wires come from the
 * interpreter's own `onActivity` events. The IGraph and Compiled tabs show the
 * same program as JSON and as the module @hlang-org/compiler prints.
 */

import { interpret, NodeRegistry } from '@hlang-org/interpreter';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BehaviorSubject } from 'rxjs';
import { liveGraph, TRANSFORM_CODES } from '@/lib/live-graph';
import { svgPath } from '@/lib/svg-path';
import { useMounted } from '@/lib/use-mounted';
import { BorderBeam } from '@/components/magicui/border-beam';
import { useReducedMotion } from 'motion/react';
import type { TransformCode } from '@/lib/live-graph';
import { Flow, NODES, TRANSFORM_FUNCTIONS, TRANSFORM_LABELS, TRANSFORM_NODES } from '@/lib/live-nodes';

export interface ProgramViews {
  /** Highlighted IGraph JSON. */
  readonly igraph: string;
  /** Highlighted ES module printed by @hlang-org/compiler. */
  readonly compiled: string;
}

interface LiveGraphProps {
  readonly views: Readonly<Record<TransformCode, ProgramViews>>;
}

type Tab = 'graph' | 'igraph' | 'compiled';
type Edge = 'text-transform' | 'transform-print';

interface Pulse {
  readonly id: number;
  readonly edge: Edge;
}

interface Wire {
  readonly d: string;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

const EDGES: readonly Edge[] = ['text-transform', 'transform-print'];

interface LogLine {
  readonly id: number;
  readonly text: string;
}

const INITIAL_TEXT = 'Ports are live streams';

export function LiveGraph({ views }: LiveGraphProps) {
  const [tab, setTab] = useState<Tab>('graph');
  const [code, setCode] = useState<TransformCode>('uppercase');
  const [text, setText] = useState(INITIAL_TEXT);
  const [output, setOutput] = useState(() => TRANSFORM_FUNCTIONS.uppercase(INITIAL_TEXT));
  // Counts the values the Writable has received; each one sends a beam around its card.
  const [arrivals, setArrivals] = useState(0);
  const [pulses, setPulses] = useState<readonly Pulse[]>([]);
  const [log, setLog] = useState<readonly LogLine[]>([]);
  // The program runs from the first client render until unmount.
  const running = useMounted();
  const input$ = useRef(new BehaviorSubject(INITIAL_TEXT));
  const counter = useRef(0);

  const pulse = useCallback((edge: Edge, line: string) => {
    counter.current += 1;
    const id = counter.current;
    setPulses(current => [...current, { id, edge }]);
    setLog(current => [{ id, text: line }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setPulses(current => current.filter(item => item.id !== id));
    }, 900);
  }, []);

  // Run the program. Changing the transform runs a new graph.
  useEffect(() => {
    const registry = new NodeRegistry()
      .register('text-source', NODES.source)
      .register(code, TRANSFORM_NODES[code])
      .register('print', NODES.print);
    const handle = interpret(
      liveGraph(code),
      { registry, createFlow: () => new Flow() },
      { middleware: { input$: input$.current, emit: (value: string) => { setOutput(value); setArrivals(current => current + 1); } } },
    );
    const activity = handle.onActivity(({ nodeId, portId }) => {
      if (nodeId === 'text' && portId === 'out') {
        pulse('text-transform', 'text.out → transform.in');
      } else if (nodeId === 'transform' && portId === 'out') {
        pulse('transform-print', 'transform.out → print.in');
      }
    });
    return () => {
      activity.dispose();
      handle.dispose();
    };
  }, [code, pulse]);

  const onInput = (value: string) => {
    setText(value);
    input$.current.next(value);
  };

  return (
    <div data-ui className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-panel bg-surface text-[15px] ring-1 ring-line ring-inset">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <div role="tablist" aria-label="Program views" className="flex gap-1">
          {(['graph', 'igraph', 'compiled'] as const).map(item => (
            <button
              key={item}
              role="tab"
              type="button"
              aria-selected={tab === item}
              onClick={() => { setTab(item); }}
              className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${
                tab === item ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {item === 'graph' ? 'Graph' : item === 'igraph' ? 'IGraph' : 'Compiled'}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 text-[14px] text-muted">
          <span
            aria-hidden
            className={`size-2 rounded-full transition-colors ${pulses.length > 0 ? 'bg-spark' : running ? 'bg-silver' : 'bg-silver-lo'}`}
          />
          <span className="sr-only sm:not-sr-only">{running ? 'Running in your browser' : 'Starting'}</span>
        </span>
      </div>

      {tab === 'graph' ? (
        <GraphView
          code={code}
          text={text}
          output={output}
          arrivals={arrivals}
          pulses={pulses}
          log={log}
          onInput={onInput}
          onCode={setCode}
        />
      ) : (
        <div className="relative flex-1 overflow-auto">
          <div
            className="[&_pre]:min-h-full [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-[13.5px] [&_pre]:leading-[1.65]"
            dangerouslySetInnerHTML={{ __html: tab === 'igraph' ? views[code].igraph : views[code].compiled }}
          />
          <p className="sticky bottom-0 border-t border-line bg-surface px-5 py-3 text-[14px] text-muted">
            {tab === 'igraph'
              ? 'The program as data. The interpreter runs this object as it is.'
              : 'The same program, printed by @hlang-org/compiler as a standalone ES module.'}
          </p>
        </div>
      )}
    </div>
  );
}

interface GraphViewProps {
  readonly code: TransformCode;
  readonly text: string;
  readonly output: string;
  readonly arrivals: number;
  readonly pulses: readonly Pulse[];
  readonly log: readonly LogLine[];
  readonly onInput: (value: string) => void;
  readonly onCode: (code: TransformCode) => void;
}

function GraphView({ code, text, output, arrivals, pulses, log, onInput, onCode }: GraphViewProps) {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  const reduced = mounted && prefersReduced === true;
  const stage = useRef<HTMLDivElement>(null);
  const textNode = useRef<HTMLDivElement>(null);
  const transformNode = useRef<HTMLDivElement>(null);
  const printNode = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Readonly<Record<Edge, Wire>> | undefined>(undefined);

  // Wires are drawn between the measured ports, so they follow the layout at every width.
  useLayoutEffect(() => {
    const root = stage.current;
    if (root === null) {
      return undefined;
    }
    const measure = () => {
      const box = root.getBoundingClientRect();
      // Ports sit on the card edges: the output at the bottom centre, the input at
      // the top centre. The wire runs down, across and down again, like the trace
      // in the hlang mark.
      const port = (element: HTMLDivElement | null, side: 'out' | 'in') => {
        const rect = element?.getBoundingClientRect();
        if (rect === undefined) {
          return { x: 0, y: 0 };
        }
        const x = rect.left - box.left + rect.width / 2;
        return side === 'out' ? { x, y: rect.bottom - box.top } : { x, y: rect.top - box.top };
      };
      const wire = (from: { x: number; y: number }, to: { x: number; y: number }): Wire => {
        const midY = (from.y + to.y) / 2;
        const bend = Math.min(14, Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2);
        const across = to.x >= from.x ? 1 : -1;
        const d =
          bend === 0
            ? svgPath('M', from.x, from.y, 'V', to.y)
            : svgPath(
                'M', from.x, from.y,
                'V', midY - bend,
                'Q', from.x, midY, from.x + bend * across, midY,
                'H', to.x - bend * across,
                'Q', to.x, midY, to.x, midY + bend,
                'V', to.y,
              );
        return { d, from, to };
      };
      setPaths({
        'text-transform': wire(port(textNode.current, 'out'), port(transformNode.current, 'in')),
        'transform-print': wire(port(transformNode.current, 'out'), port(printNode.current, 'in')),
      });
    };
    measure();
    // Re-measure when the stage or any card changes size, and once fonts settle.
    const observer = new ResizeObserver(measure);
    for (const element of [root, textNode.current, transformNode.current, printNode.current]) {
      if (element !== null) {
        observer.observe(element);
      }
    }
    void document.fonts.ready.then(measure);
    return () => { observer.disconnect(); };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div ref={stage} className="relative flex-1 px-5 py-6 sm:px-8">
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible">
          {paths === undefined
            ? null
            : EDGES.map(edge => {
                const wire = paths[edge];
                const active = pulses.some(item => item.edge === edge);
                return (
                  <g key={edge} className={`transition-colors duration-300 ${active ? 'text-spark' : 'text-silver-lo'}`}>
                    <path d={wire.d} fill="none" strokeWidth={2} stroke="currentColor" />
                    <circle cx={wire.from.x} cy={wire.from.y} r={5} strokeWidth={2} stroke="currentColor" className="fill-surface" />
                    <circle cx={wire.to.x} cy={wire.to.y} r={5} fill="currentColor" />
                    {pulses
                      .filter(item => item.edge === edge)
                      .map(item => (
                        <circle key={item.id} r={4.5} className="fill-spark motion-reduce:hidden">
                          <animateMotion dur="0.7s" fill="freeze" path={wire.d} />
                          <animate attributeName="opacity" values="1;1;0" dur="0.9s" fill="freeze" />
                        </circle>
                      ))}
                  </g>
                );
              })}
        </svg>

        <div className="relative grid h-full grid-rows-3 gap-6">
          <div className="flex items-start">
            <NodeCard ref={textNode} kind="R" title="Text" note="Readable">
              <label className="sr-only" htmlFor="live-text">Text to send</label>
              <input
                id="live-text"
                value={text}
                maxLength={48}
                onChange={event => { onInput(event.target.value); }}
                className="w-full rounded-inner bg-surface-3 px-3 py-2 ring-1 ring-line ring-inset text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-silver"
              />
            </NodeCard>
          </div>
          <div className="flex items-center justify-center">
            <NodeCard ref={transformNode} kind="T" title={TRANSFORM_LABELS[code]} note="Transform">
              <div role="radiogroup" aria-label="Transform" className="flex flex-wrap gap-1.5">
                {TRANSFORM_CODES.map(item => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={code === item}
                    onClick={() => { onCode(item); }}
                    className={`rounded-full px-3 py-1 text-[14px] transition-colors ${
                      code === item ? 'bg-silver text-ground' : 'bg-surface-3 text-muted hover:text-ink'
                    }`}
                  >
                    {TRANSFORM_LABELS[item]}
                  </button>
                ))}
              </div>
            </NodeCard>
          </div>
          <div className="flex items-end justify-end">
            <NodeCard ref={printNode} kind="W" title="Output" note="Writable">
              {/* The first value arrives on mount; beams start with the visitor's own input. */}
              {reduced || arrivals < 2 ? null : (
                <BorderBeam
                  key={arrivals}
                  size={70}
                  duration={1.1}
                  borderWidth={1.5}
                  colorFrom="var(--spark)"
                  colorTo="var(--silver)"
                  transition={{ repeat: 0 }}
                />
              )}
              <output aria-live="polite" className="block min-h-[30px] break-words text-[22px] font-medium tracking-[-0.02em] text-ink">
                {output}
              </output>
            </NodeCard>
          </div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-3">
        <p className="mb-1 text-[14px] text-muted">Activity from the interpreter</p>
        <ol aria-live="off" className="min-h-[72px] space-y-0.5 text-[13px] text-silver [&_code]:font-mono">
          {log.length === 0 ? <li className="text-silver-lo">Type in the Text node.</li> : null}
          {log.map(line => (
            <li key={line.id}>
              <code>{line.text}</code>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

interface NodeCardProps {
  readonly ref: React.Ref<HTMLDivElement>;
  readonly kind: 'R' | 'T' | 'W';
  readonly title: string;
  readonly note: string;
  readonly children: ReactNode;
}

function NodeCard({ ref, kind, title, note, children }: NodeCardProps) {
  return (
    <div ref={ref} className="relative w-[min(100%,300px)] rounded-card bg-surface-2 p-4 ring-1 ring-line ring-inset">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-6 place-items-center rounded-full bg-surface-3 text-[13px] font-semibold text-silver">{kind}</span>
        <span className="font-medium text-ink">{title}</span>
        <span className="ml-auto text-[13px] text-muted">{note}</span>
      </div>
      {children}
    </div>
  );
}
