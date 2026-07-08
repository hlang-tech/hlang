/**
 * `EditorProvider` — supplies a headless `EditorCore` to the React tree.
 *
 * The bindings never construct the core; a host assembles it (with whatever
 * node registry / graph runner it needs) and passes it in. Hooks read it from
 * this context.
 */

import { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { EditorCore } from '@hlang-org/editor-core';

const EditorContext = createContext<EditorCore | null>(null);

export interface EditorProviderProps {
  readonly core: EditorCore;
  readonly children: ReactNode;
}

export function EditorProvider({ core, children }: EditorProviderProps): ReactElement {
  return <EditorContext.Provider value={core}>{children}</EditorContext.Provider>;
}

/** Access the `EditorCore` from context. Throws if used outside a provider. */
export function useEditor(): EditorCore {
  const core = useContext(EditorContext);
  if (core === null) {
    throw new Error('useEditor must be used within an <EditorProvider>.');
  }
  return core;
}
