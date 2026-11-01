'use client';

import '@hlang-org/editor-ui/tokens.css';
import dynamic from 'next/dynamic';

/**
 * The editor measures the DOM and runs a flow, so it renders on the client
 * only; the frame around it keeps its size while the code loads.
 */
export const LumenEditorLoader = dynamic(() => import('@/components/lumen/LumenEditor').then(module => module.LumenEditor), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[var(--hl-void)] text-[14px] text-[var(--hl-ink-3)]">Loading the editor</div>
  ),
});
