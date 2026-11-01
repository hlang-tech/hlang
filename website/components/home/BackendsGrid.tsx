'use client';

import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MagicCard } from '@/components/magicui/magic-card';
import { SectionHeader } from '@/components/SectionHeader';
import { enter } from '@/lib/enter';
import { orthogonalPath } from '@/lib/route';
import type { Point, RoutePoint } from '@/lib/route';
import { useMounted } from '@/lib/use-mounted';

export interface BackendField {
  readonly clause: string;
  readonly tone: string;
  readonly title: string;
  readonly body: ReactNode;
}

interface BackendsGridProps {
  readonly heading: string;
  readonly lead: string;
  /** IGraph, plan, interpreter, compiler, in that order. */
  readonly fields: readonly [BackendField, BackendField, BackendField, BackendField];
}

/** A connection drawn between two card ports: hollow where it leaves, filled where it arrives. */
interface Wire {
  readonly d: string;
  readonly from: Point;
  readonly to: Point;
}

interface Routes {
  /** IGraph to planGraph. */
  readonly front: Wire;
  /** planGraph to the interpreter, through the fork. */
  readonly interpret: Wire;
  /** planGraph to the compiler, through the fork. */
  readonly compile: Wire;
  /** Where the plan splits into the two backends: a square junction under a dot. */
  readonly fork: RoutePoint;
}

interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly cx: number;
  readonly cy: number;
}

function wire(points: readonly RoutePoint[]): Wire {
  const from = points[0] ?? { x: 0, y: 0 };
  const to = points[points.length - 1] ?? from;
  return { d: orthogonalPath(points), from, to };
}

/** Ports on a card's left side: the input in the upper third, the output in the lower third. */
function leftIn(box: Box): Point {
  return { x: box.left, y: box.top + (box.bottom - box.top) / 3 };
}
function leftOut(box: Box): Point {
  return { x: box.left, y: box.top + ((box.bottom - box.top) * 2) / 3 };
}

/**
 * Routes for two layouts. On one row, ports sit on the card sides and the
 * compiler branch passes under the interpreter. Stacked, every connection runs
 * on one rail left of the cards, clear of the text: the plan's output joins the
 * rail, one branch turns into the interpreter, and the other continues down to
 * the compiler.
 */
function route(graph: Box, plan: Box, interpreter: Box, compiler: Box): Routes {
  const oneRow = Math.abs(plan.top - compiler.top) < plan.bottom - plan.top;

  if (oneRow) {
    const gutterA = (graph.right + plan.left) / 2;
    const fork: RoutePoint = { x: (plan.right + interpreter.left) / 2, y: plan.cy, junction: true };
    const gutterB = (interpreter.right + compiler.left) / 2;
    const lane = Math.max(plan.bottom, interpreter.bottom, compiler.bottom) + 44;
    return {
      front: wire([{ x: graph.right, y: graph.cy }, { x: gutterA, y: graph.cy }, { x: gutterA, y: plan.cy }, { x: plan.left, y: plan.cy }]),
      interpret: wire([{ x: plan.right, y: plan.cy }, fork, { x: fork.x, y: interpreter.cy }, { x: interpreter.left, y: interpreter.cy }]),
      compile: wire([
        { x: plan.right, y: plan.cy },
        fork,
        { x: fork.x, y: lane },
        { x: gutterB, y: lane },
        { x: gutterB, y: compiler.cy },
        { x: compiler.left, y: compiler.cy },
      ]),
      fork,
    };
  }

  const left = Math.min(graph.left, plan.left, interpreter.left, compiler.left);
  // Stacked on a phone, text and cards share a 32px left gutter and the rail
  // runs in its middle; with columns, the rail runs in the gap left of the cards.
  const rail = left < 80 ? left - 16 : left - 24;
  const graphOut = leftOut(graph);
  const planIn = leftIn(plan);
  const planOut = leftOut(plan);
  const interpreterIn = leftIn(interpreter);
  const compilerIn = leftIn(compiler);
  const fork: RoutePoint = { x: rail, y: interpreterIn.y, junction: true };
  return {
    front: wire([graphOut, { x: rail, y: graphOut.y }, { x: rail, y: planIn.y }, planIn]),
    interpret: wire([planOut, { x: rail, y: planOut.y }, fork, interpreterIn]),
    compile: wire([planOut, { x: rail, y: planOut.y }, fork, { x: rail, y: compilerIn.y }, compilerIn]),
    fork,
  };
}

export function BackendsGrid({ heading, lead, fields }: BackendsGridProps) {
  const container = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [routes, setRoutes] = useState<Routes | undefined>(undefined);
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  // Read the preference only after hydration so server and client markup match.
  const reduced = mounted && prefersReduced === true;
  // Each time the section comes into view, a value travels the routes once more.
  const [run, setRun] = useState(0);

  const measure = useCallback((): void => {
    const root = container.current?.getBoundingClientRect();
    const boxes = cards.current.map(element => {
      const rect = element?.getBoundingClientRect();
      if (rect === undefined || root === undefined) {
        return undefined;
      }
      const left = rect.left - root.left;
      const top = rect.top - root.top;
      return { left, top, right: left + rect.width, bottom: top + rect.height, cx: left + rect.width / 2, cy: top + rect.height / 2 };
    });
    const [graph, plan, interpreter, compiler] = boxes;
    if (graph !== undefined && plan !== undefined && interpreter !== undefined && compiler !== undefined) {
      setRoutes(route(graph, plan, interpreter, compiler));
    }
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [container.current, ...cards.current]) {
      if (element !== null) {
        observer.observe(element);
      }
    }
    void document.fonts.ready.then(measure);
    return () => { observer.disconnect(); };
  }, [measure]);

  useEffect(() => {
    const element = container.current;
    if (element === null) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setRun(current => current + 1);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, []);

  return (
    <section aria-labelledby="backends-title">
      <SectionHeader id="backends-title" title={heading} lead={lead} className="frame pb-14 pt-20 md:pt-36" />
      <div ref={container} className="relative grid xl:grid-cols-4">
      {fields.map((field, index) => (
        <div
          key={field.clause}
          className={`relative min-w-0 px-[var(--margin)] py-12 md:py-14 xl:flex xl:min-h-[72svh] xl:flex-col xl:px-7 xl:py-8 ${field.tone}`}
        >
          {/* Stacked: the clause, then its card. On one row (xl): the card mid-field, the clause at the foot. */}
          <div className="pl-8 md:grid md:grid-cols-12 md:items-center md:gap-x-6 md:pl-0 xl:contents">
            <p className="max-w-[18ch] text-m font-medium tracking-[-0.02em] md:col-span-6 xl:order-last xl:mt-auto" data-enter style={enter(1)}>
              {field.clause}
            </p>
            <div className="mt-6 min-w-0 md:col-span-5 md:col-start-8 md:mt-0 md:pl-0 xl:absolute xl:inset-x-7 xl:top-[30%]">
              <div
                ref={element => { cards.current[index] = element; }}
                className="relative z-20 w-full min-w-0 max-w-[296px]"
              >
                <MagicCard
                  className="rounded-card"
                  gradientSize={220}
                  gradientColor="var(--surface-2)"
                  gradientFrom="var(--silver)"
                  gradientTo="var(--silver-lo)"
                >
                  <div data-ui className="h-[196px] p-4 text-[13px] leading-[1.6] text-silver">
                    <p className="mb-2 text-[14px] font-medium text-ink">{field.title}</p>
                    <pre className="overflow-hidden whitespace-pre-wrap break-words font-mono">{field.body}</pre>
                  </div>
                </MagicCard>
              </div>
            </div>
          </div>
        </div>
      ))}
      {routes === undefined ? null : (
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible">
          {([routes.front, routes.interpret, routes.compile] as const).map((item, index) => (
            <g key={item.d} className="text-silver-lo">
              <path d={item.d} fill="none" stroke="currentColor" strokeWidth={1.5} />
              {reduced ? null : (
                <path
                  key={run}
                  d={item.d}
                  fill="none"
                  pathLength={1}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="backends-pulse stroke-spark"
                  style={{ animationDelay: index === 0 ? '0ms' : '900ms' }}
                />
              )}
              <circle cx={item.from.x} cy={item.from.y} r={4.5} strokeWidth={1.5} stroke="currentColor" className="fill-ground" />
              <circle cx={item.to.x} cy={item.to.y} r={4.5} fill="currentColor" />
            </g>
          ))}
          <circle cx={routes.fork.x} cy={routes.fork.y} r={4} className="fill-silver" />
        </svg>
      )}
      </div>
    </section>
  );
}
