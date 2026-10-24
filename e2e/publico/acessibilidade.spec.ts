import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';

import { expect, test, type Page } from '../fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function formatViolations(violations: AxeResults['violations']) {
  return violations.map((violation) => ({
    regra: violation.id,
    impacto: violation.impact,
    alvos: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );
  expect(formatViolations(violations), 'violações sérias ou críticas de acessibilidade').toEqual(
    [],
  );
}

const publicScreens = [
  { name: 'cardápio', path: '/cardapio', heading: 'Cardápio' },
  { name: 'produto', path: '/produto/coxinha-de-frango', heading: 'Coxinha de frango' },
  { name: 'busca com termo', path: '/busca?q=pastel', heading: 'Busca' },
  { name: 'Info', path: '/info', heading: 'Informações' },
  { name: 'login do painel', path: '/admin/login', heading: 'Painel da Salgaê' },
] as const;

test.describe('acessibilidade pública', () => {
  test('início não tem violações sérias', { tag: '@responsive' }, async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cardápio da Salgaê' }),
    ).toBeAttached();
    await expectNoSeriousViolations(page);
  });

  for (const screen of publicScreens) {
    test(`${screen.name} não tem violações sérias`, async ({ page }) => {
      await page.goto(screen.path);
      await expect(page.getByRole('heading', { name: screen.heading })).toBeAttached();
      await expectNoSeriousViolations(page);
    });
  }
});
