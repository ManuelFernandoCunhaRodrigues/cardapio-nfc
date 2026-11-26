import { test } from '../fixtures';

// DIAGNÓSTICO TEMPORÁRIO (não mesclar): abre as páginas com loading.tsx várias vezes e conta as
// cópias escondidas do streaming (`body > div[hidden][id^="S:"]`) que sobram depois da hidratação.
const ROUTES = ['/cardapio', '/busca', '/admin', '/admin/produtos'];
const ROUNDS = 40;

test('conta as cópias escondidas do streaming que sobram', async ({ page }, testInfo) => {
  test.setTimeout(20 * 60_000);
  const orphansByRoute: Record<string, number> = {};
  for (let round = 0; round < ROUNDS; round += 1) {
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(700);
      const orphans = await page.locator('body > div[hidden][id^="S:"]').count();
      if (orphans) orphansByRoute[route] = (orphansByRoute[route] ?? 0) + 1;
    }
  }
  console.log(
    `S0-STRESS ${testInfo.project.name} ${ROUNDS * ROUTES.length} cargas ${JSON.stringify(orphansByRoute)}`,
  );
});
