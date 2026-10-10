// Confere códigos HTTP e redirecionamentos da homologação (plano H3 do Épico 5).
// Uso: node scripts/verificar-urls.mjs [baseUrl]   (sai com código 1 se algo divergir)
const base = (process.argv[2] ?? 'https://salgae-homologacao.vercel.app').replace(/\/$/, '');
const host = new URL(base).host;
const productId = '35fadaf3-79c3-444d-a50f-b0a604d709a1';

/** [url, status esperado, destino esperado do redirecionamento (ou null)] */
const cases = [
  ...['/', '/cardapio', '/busca', '/info', '/admin/login', `/produto/${productId}`].map((p) => [`${base}${p}`, 200, null]),
  [`${base}/produto/00000000-0000-0000-0000-000000000000`, 404, null],
  [`${base}/produto/nao-e-uuid`, 404, null],
  ...['/admin', '/admin/produtos', '/admin/categorias', '/admin/destaques', '/admin/loja', '/admin/produtos/novo']
    .map((p) => [`${base}${p}`, 307, `${base}/admin/login`]),
  [`http://${host}/`, 308, `https://${host}/`],
];

let failed = false;
for (const [url, status, location] of cases) {
  const response = await fetch(url, { redirect: 'manual' });
  const target = response.headers.get('location');
  const resolved = target ? new URL(target, url).toString() : null;
  const ok = response.status === status && (location === null || resolved === location || resolved?.startsWith(`${location}?`));
  failed ||= !ok;
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${response.status}${resolved ? ` → ${resolved}` : ''}  ${url}  (esperado ${status}${location ? ` → ${location}` : ''})`);
}
process.exit(failed ? 1 : 0);
