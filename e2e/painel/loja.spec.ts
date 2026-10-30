import { expect, test, withStoreSettingsRestored, type Page } from '../fixtures';

async function saveStatusOverride(page: Page, value: 'auto' | 'open' | 'closed') {
  await page.goto('/admin/loja');
  await page.getByLabel('Funcionamento agora').selectOption(value);
  await page
    .getByRole('button', { name: 'Salvar dados da loja' })
    .filter({ visible: true })
    .click();
  await expect(page.getByText('Dados da loja salvos com sucesso.')).toBeVisible();
}

async function expectPublicStatus(page: Page, label: 'Aberta' | 'Fechada', suffix: string) {
  await page.goto(`/cardapio?estado=${suffix}`);
  await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
  await page.goto(`/info?estado=${suffix}`);
  await expect(page.getByRole('heading', { level: 2, name: label, exact: true })).toBeVisible();
}

test.describe('estado da loja', () => {
  test('abrir e fechar manualmente muda os selos públicos', async ({ page, adminDb }) => {
    await withStoreSettingsRestored(adminDb, async () => {
      await saveStatusOverride(page, 'open');
      await expectPublicStatus(page, 'Aberta', 'manual-aberta');

      await saveStatusOverride(page, 'closed');
      await expectPublicStatus(page, 'Fechada', 'manual-fechada');
    });
  });

  test('o horário congelado muda somente o selo calculado no cliente', async ({
    page,
    adminDb,
  }) => {
    await withStoreSettingsRestored(adminDb, async () => {
      await page.clock.install();
      await page.clock.setFixedTime(new Date('2026-10-26T10:00:00-03:00'));
      await page.goto('/admin/loja');
      await page.getByLabel('Funcionamento agora').selectOption('auto');

      const mondayClosed = page.getByRole('switch', { name: /Segunda/ });
      if (await mondayClosed.isChecked()) await mondayClosed.uncheck();
      await page.getByLabel('Abertura de Segunda').fill('09:00');
      await page.getByLabel('Fechamento de Segunda').fill('18:00');
      await page
        .getByRole('button', { name: 'Salvar dados da loja' })
        .filter({ visible: true })
        .click();
      await expect(page.getByText('Dados da loja salvos com sucesso.')).toBeVisible();

      // O relógio do servidor não é alterado; validamos só o status recalculado no navegador.
      await page.clock.setFixedTime(new Date('2026-10-26T10:00:00-03:00'));
      await expectPublicStatus(page, 'Aberta', 'horario-aberto');
      await page.clock.setFixedTime(new Date('2026-10-26T20:00:00-03:00'));
      await expectPublicStatus(page, 'Fechada', 'horario-fechado');
    });
  });
});
