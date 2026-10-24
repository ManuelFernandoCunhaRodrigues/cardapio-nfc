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

const panelScreens = [
  { name: 'Resumo', path: '/admin', heading: 'Resumo' },
  { name: 'Produtos', path: '/admin/produtos', heading: 'Produtos' },
  { name: 'Categorias', path: '/admin/categorias', heading: 'Categorias' },
  { name: 'Destaques', path: '/admin/destaques', heading: 'Destaques' },
  { name: 'Loja', path: '/admin/loja', heading: 'Dados da loja' },
] as const;

test.describe('acessibilidade do painel', () => {
  for (const screen of panelScreens) {
    test(`${screen.name} não tem violações sérias`, { tag: '@leitura' }, async ({ page }) => {
      await page.goto(screen.path);
      await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }
});
