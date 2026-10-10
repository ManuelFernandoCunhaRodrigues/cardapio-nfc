import type { ReactNode } from 'react';

export function ProductRow({ children, className = '', ariaLabel }: Readonly<{ children: ReactNode; className?: string; ariaLabel?: string }>) {
  return <div className="@container -mx-4"><div role={ariaLabel ? 'group' : undefined} aria-label={ariaLabel} className={`flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] ${className}`}>{children}</div></div>;
}
