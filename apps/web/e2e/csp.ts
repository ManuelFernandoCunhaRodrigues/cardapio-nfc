import type { Page } from '@playwright/test';

/** Junta as mensagens do navegador que indicam algo bloqueado pela Content-Security-Policy. */
export function watchCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/Content Security Policy|Refused to (load|execute|connect|frame|apply|create)/i.test(text))
      violations.push(text);
  });
  return violations;
}
