'use client';

import { useEffect } from 'react';

/** Wires every code frame's Copy button on the page: copies the code, then confirms. */
export function CodeCopy() {
  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-copy]') : null;
      const code = button?.closest('figure')?.querySelector('pre')?.textContent;
      if (button === null || code === undefined) {
        return;
      }
      void navigator.clipboard.writeText(code).then(() => {
        button.textContent = 'Copied';
        window.setTimeout(() => {
          button.textContent = 'Copy';
        }, 1600);
      });
    };
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('click', onClick); };
  }, []);
  return null;
}
