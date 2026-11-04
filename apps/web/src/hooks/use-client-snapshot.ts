'use client';

import { useSyncExternalStore } from 'react';

const ignoreChanges = () => () => {};

// `false` no HTML do servidor e na hidratação; `true` logo depois, sem desencontro de markup.
export function useHydrated() {
  return useSyncExternalStore(
    ignoreChanges,
    () => true,
    () => false,
  );
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
