'use client';

import { useId } from 'react';

type ChoiceChipsProps<T extends string> = {
  legend: string;
  options: ReadonlyArray<readonly [value: T, label: string]>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Escolha única em chips. São rádios de verdade dentro de um `fieldset`: o leitor de tela diz o
 * grupo e qual está marcado, e as setas do teclado trocam a opção.
 */
export function ChoiceChips<T extends string>({
  legend,
  options,
  value,
  onChange,
  className = 'grid grid-cols-2 gap-2',
}: Readonly<ChoiceChipsProps<T>>) {
  const name = `chips-${useId()}`;
  return (
    <fieldset>
      <legend className="text-sm font-bold text-ink">{legend}</legend>
      <div className={`mt-2 ${className}`}>
        {options.map(([optionValue, label]) => (
          <label
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-bold focus-within:ring-4 focus-within:ring-brand/30 ${value === optionValue ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
            key={optionValue}
          >
            <input
              checked={value === optionValue}
              className="sr-only"
              name={name}
              onChange={() => onChange(optionValue)}
              type="radio"
              value={optionValue}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
