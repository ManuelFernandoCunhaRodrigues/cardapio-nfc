'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { MenuCategory } from '@/features/menu/types';

export function CategoryNav({ categories }: Readonly<{ categories: MenuCategory[] }>) {
  const [active, setActive] = useState(categories[0]?.slug ?? '');
  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLAnchorElement>());
  const navigationTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const sections = categories
      .map(({ slug }) => document.getElementById(slug))
      .filter(Boolean) as HTMLElement[];
    const categorySlugs = new Set(categories.map(({ slug }) => slug));
    const lastSection = sections.at(-1);
    const selectHash = () => {
      let hash = window.location.hash.slice(1);
      try {
        hash = decodeURIComponent(hash);
      } catch {
        return;
      }
      if (!categorySlugs.has(hash)) return;
      navigationTargetRef.current = hash;
      setActive(hash);
    };
    const selectLastAtPageEnd = () => {
      if (navigationTargetRef.current || !lastSection) return false;
      const { scrollHeight } = document.documentElement;
      // Página que não rola (poucas categorias, tela alta) não "chegou ao fim": fica a primeira.
      const pageScrolls = scrollHeight > window.innerHeight + 2;
      const reachedPageEnd =
        pageScrolls &&
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= scrollHeight - 2;
      if (reachedPageEnd) setActive(lastSection.id);
      return reachedPageEnd;
    };
    const releaseNavigationTarget = () => {
      navigationTargetRef.current = null;
      requestAnimationFrame(selectLastAtPageEnd);
    };
    const releaseNavigationTargetFromKeyboard = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)) {
        releaseNavigationTarget();
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (navigationTargetRef.current || selectLastAtPageEnd()) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-76px 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    selectHash();
    window.addEventListener('hashchange', selectHash);
    window.addEventListener('scroll', selectLastAtPageEnd, { passive: true });
    window.addEventListener('touchstart', releaseNavigationTarget, { passive: true });
    window.addEventListener('wheel', releaseNavigationTarget, { passive: true });
    window.addEventListener('keydown', releaseNavigationTargetFromKeyboard);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', selectHash);
      window.removeEventListener('scroll', selectLastAtPageEnd);
      window.removeEventListener('touchstart', releaseNavigationTarget);
      window.removeEventListener('wheel', releaseNavigationTarget);
      window.removeEventListener('keydown', releaseNavigationTargetFromKeyboard);
    };
  }, [categories]);

  useEffect(() => {
    const row = rowRef.current;
    const chip = chipRefs.current.get(active);
    if (!row || !chip) return;
    const rowRect = row.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.left >= rowRect.left && chipRect.right <= rowRect.right) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollTo({
      behavior: reduceMotion ? 'auto' : 'smooth',
      left: row.scrollLeft + chipRect.left - rowRect.left - (rowRect.width - chipRect.width) / 2,
    });
  }, [active]);

  return (
    <nav aria-label="Categorias do cardápio" className="sticky top-0 z-20 bg-cream py-1">
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={rowRef}
      >
        {categories.map((category) => (
          <Link
            aria-current={active === category.slug ? 'location' : undefined}
            className={`relative grid h-9 shrink-0 place-items-center rounded-full border px-3.5 font-[family-name:var(--font-poppins)] text-sm font-medium before:absolute before:-inset-y-1 ${active === category.slug ? 'border-ink bg-ink font-semibold text-white' : 'border-border bg-white text-ink'}`}
            href={`#${category.slug}`}
            key={category.id}
            onClick={() => {
              navigationTargetRef.current = category.slug;
              setActive(category.slug);
            }}
            ref={(element) => {
              if (element) chipRefs.current.set(category.slug, element);
              else chipRefs.current.delete(category.slug);
            }}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
