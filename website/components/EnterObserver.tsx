'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Entrance for the parts of each section. Content is visible without script;
 * this marks the document as scripted, then reveals `[data-enter]` elements
 * once as they scroll into view. Reduced motion skips the travel in CSS.
 */
export function EnterObserver() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-entered', '');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    document.querySelectorAll('[data-enter]:not([data-entered])').forEach(element => {
      observer.observe(element);
    });
    return () => { observer.disconnect(); };
  }, [pathname]);
  return null;
}
