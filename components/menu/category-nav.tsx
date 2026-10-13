'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { MenuCategory } from '@/lib/menu/types';

export function CategoryNav({ categories }: Readonly<{ categories: MenuCategory[] }>) {
  const [active, setActive] = useState(categories[0]?.slug ?? '');

  useEffect(() => {
    const sections = categories.map(({ slug }) => document.getElementById(slug)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-76px 0px -55% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  return <nav aria-label="Categorias do cardápio" className="sticky top-0 z-20 bg-cream py-1"><div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{categories.map((category) => <Link aria-current={active === category.slug ? 'location' : undefined} className={`relative grid h-9 shrink-0 place-items-center rounded-full border px-3.5 font-[family-name:var(--font-poppins)] text-sm font-medium before:absolute before:-inset-y-1 ${active === category.slug ? 'border-ink bg-ink font-semibold text-white' : 'border-border bg-white text-ink'}`} href={`#${category.slug}`} key={category.id} onClick={() => setActive(category.slug)}>{category.name}</Link>)}</div></nav>;
}
