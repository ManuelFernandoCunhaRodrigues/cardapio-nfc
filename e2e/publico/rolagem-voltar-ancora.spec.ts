import { expect, test, type Page } from '../fixtures';

async function expectScrollRestoredAfterProduct(page: Page, anchor: string, categoryName: string) {
  const category = page.locator(`section#${anchor}`).filter({ visible: true });
  await expect(
    page.getByRole('navigation', { name: 'Categorias do cardápio' }).getByRole('link', {
      name: categoryName,
    }),
  ).toHaveAttribute('aria-current', 'location');
  await expect
    .poll(() => category.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(120);

  await page.mouse.wheel(0, 100_000);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      ),
    )
    .toBe(true);
  const scrollBeforeProduct = await page.evaluate(() => window.scrollY);
  const anchorScroll = await category.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  expect(scrollBeforeProduct - anchorScroll).toBeGreaterThan(250);

  await page
    .locator('section#doces')
    .filter({ visible: true })
    .getByRole('link', { name: /Brigadeiro/ })
    .click();
  await expect(page).toHaveURL(/\/produto\/brigadeiro$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/cardapio(?:#.*)?$/);
  await expect
    .poll(() =>
      page.evaluate((previous) => Math.abs(window.scrollY - previous), scrollBeforeProduct),
    )
    .toBeLessThan(80);
  await expect(
    page.getByRole('navigation', { name: 'Categorias do cardápio' }).getByRole('link', {
      name: 'Doces',
    }),
  ).toHaveAttribute('aria-current', 'location');
}

test('restaura a rolagem após entrar pelo atalho da Início', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Categorias', exact: true })
    .getByRole('link', {
      name: 'Coxinhas',
    })
    .click();
  await expect(page).toHaveURL(/\/cardapio#coxinhas$/);
  await expectScrollRestoredAfterProduct(page, 'coxinhas', 'Coxinhas');
});

test('restaura a rolagem após tocar no chip do Cardápio', async ({ page }) => {
  await page.goto('/cardapio');
  await page
    .getByRole('navigation', { name: 'Categorias do cardápio' })
    .getByRole('link', {
      name: 'Pastéis',
    })
    .click();
  await expect(page).toHaveURL(/\/cardapio#pasteis$/);
  await expectScrollRestoredAfterProduct(page, 'pasteis', 'Pastéis');
});
