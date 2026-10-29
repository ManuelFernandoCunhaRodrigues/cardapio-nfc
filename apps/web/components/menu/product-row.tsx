import type { ReactNode } from 'react';

export function ProductRow({
  children,
  className = '',
  ariaLabel,
}: Readonly<{ children: ReactNode; className?: string; ariaLabel?: string }>) {
  return (
    <div className="@container -mx-4">
      <div
        role={ariaLabel ? 'list' : undefined}
        aria-label={ariaLabel}
        className={`flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
