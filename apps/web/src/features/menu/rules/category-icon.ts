import type { MenuCategory } from '@/features/menu/types';

import { normalizeMenuSearch } from './search';

export type CategoryIcon = { kind: 'emoji' | 'initial'; symbol: string };

// A ordem importa: "Combo de pizza" é combo. Os termos são comparados sem acento e em minúsculas.
const emojiByTerms: ReadonlyArray<readonly [emoji: string, terms: readonly string[]]> = [
  ['🍱', ['combo']],
  ['🍕', ['pizza']],
  ['🫓', ['esfiha', 'esfirra']],
  ['🥟', ['pastel', 'pasteis']],
  ['🍗', ['coxinha']],
  ['🧆', ['salgad', 'kibe', 'quibe']],
  ['🍔', ['lanche', 'sanduiche', 'hamburguer', 'burger']],
  ['🍟', ['porcao', 'porcoes', 'batata', 'frita']],
  ['🥤', ['bebida', 'drink', 'suco', 'refri']],
  ['☕', ['cafe']],
  ['🍰', ['bolo', 'torta']],
  ['🍫', ['doce', 'sobremesa', 'chocolate']],
];

/** Reserva para a categoria sem foto: emoji pelo nome ou pelo endereço; senão, a inicial do nome. */
export function getCategoryIcon(category: Pick<MenuCategory, 'name' | 'slug'>): CategoryIcon {
  const text = normalizeMenuSearch(`${category.slug} ${category.name}`);
  const match = emojiByTerms.find(([, terms]) => terms.some((term) => text.includes(term)));
  if (match) return { kind: 'emoji', symbol: match[0] };
  return { kind: 'initial', symbol: category.name.trim().charAt(0).toLocaleUpperCase('pt-BR') };
}
