import Link from 'next/link';
import { LumenEditorLoader } from '@/components/lumen/LumenEditorLoader';
import { SectionHeader } from '@/components/SectionHeader';
import { enter } from '@/lib/enter';

/** What the editor below does, each one a feature of the packages it is built from. */
const CAPABILITIES: readonly { readonly title: string; readonly body: string }[] = [
  { title: 'It runs while you edit', body: 'Run interprets the graph in your browser and the edges light as values pass. Change a parameter or a connection and the flow restarts.' },
  { title: 'Every edit can be undone', body: 'Adding, moving, wiring and deleting are commands in editor-core, so undo and redo cover all of them.' },
  { title: 'Wrong links are refused', body: 'An output connects only to an input, and a link that breaks the R, T, W rules cannot be drawn. Feedback loops between transforms stay legal.' },
  { title: 'Search to add a node', body: 'Double-click the canvas, or drag a port into empty space to see only the nodes that can connect there.' },
  { title: 'Drop a node on a wire', body: 'A transform dropped on a connection is spliced into it, with both links rewired in one undoable step.' },
  { title: 'The output is an IGraph', body: 'The editor reads and writes the same JSON the interpreter runs and the compiler prints.' },
];

export function LumenSection() {
  return (
    <section id="lumen" aria-labelledby="lumen-title" className="frame scroll-mt-20 py-20 md:py-36">
      <SectionHeader
        id="lumen-title"
        title="Lumen, the editor for hlang graphs"
        lead="This is the editor itself, running in your browser. Drag a node, change a parameter in the inspector or connect a port, and the running total follows."
      />

      <div
        className="mt-14 h-[600px] overflow-hidden rounded-panel bg-[var(--hl-void)] ring-1 ring-line ring-inset md:h-[clamp(640px,80svh,820px)]"
        data-enter
        style={enter(2)}
      >
        <LumenEditorLoader />
      </div>

      <ul className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((item, index) => (
          <li key={item.title} className="min-w-0 max-w-[40ch]" data-enter style={enter(index % 3)}>
            <h3 className="text-s font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-s text-muted">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-14 text-s text-muted">
        Lumen is three packages, released as 0.x while the API settles: a headless core, React bindings and a design
        system.{' '}
        <Link href="/docs/lumen" className="text-ink underline decoration-silver-lo underline-offset-4 hover:decoration-ink">
          Read the Lumen docs
        </Link>
      </p>
    </section>
  );
}
