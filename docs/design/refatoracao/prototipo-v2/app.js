// Protótipo estático da fase 1. Dados de exemplo iguais aos das telas do Figma.
const parametros = new URLSearchParams(location.search);
const tela = parametros.get('tela') === 'cardapio' ? 'cardapio' : 'inicio';

const categorias = [
  { nome: 'Coxinhas', arte: 'coxinha', produtos: [
    { nome: 'Coxinha de frango', texto: 'Frango cremoso em massa crocante.', preco: 'R$ 7,00', arte: 'coxinha', selo: 'mais-pedido' },
    { nome: 'Coxinha Catupiry', texto: 'Frango com Catupiry original.', preco: 'R$ 8,90', arte: 'catupiry', selo: 'quentinho' },
    { nome: 'Bolinha de queijo', texto: 'Queijo derretido, casquinha crocante.', preco: 'R$ 8,90', arte: 'bolinha', selo: 'novo' },
  ] },
  { nome: 'Pastéis', arte: 'pastel', produtos: [
    { nome: 'Pastel de carne', texto: 'Carne temperada e queijo.', preco: 'R$ 9,00', arte: 'pastel' },
    { nome: 'Risole de camarão', texto: 'Camarão temperado com requeijão.', preco: 'R$ 9,90', arte: 'risole', indisponivel: true },
  ] },
  { nome: 'Porções', arte: 'fritas', produtos: [
    { nome: 'Batata frita', texto: 'Porção de batata crocante.', preco: 'R$ 18,00', arte: 'fritas', selo: 'mais-pedido' },
  ] },
  { nome: 'Combos', arte: 'combo', produtos: [
    { nome: 'Combo Salgaê', texto: 'Coxinha, batata e refrigerante.', preco: 'R$ 25,00', arte: 'combo', selo: 'mais-pedido' },
  ] },
  { nome: 'Bebidas', arte: 'bebida', produtos: [
    { nome: 'Refrigerante lata', texto: 'Lata de 350 ml, bem gelada.', preco: 'R$ 6,00', arte: 'bebida' },
    { nome: 'Suco natural', texto: 'Laranja espremida na hora.', preco: 'R$ 8,00', arte: 'bebida' },
  ] },
  { nome: 'Doces', arte: 'doce', produtos: [
    { nome: 'Brigadeiro', texto: 'Feito na casa, no ponto.', preco: 'R$ 4,00', arte: 'doce', selo: 'novo' },
  ] },
];

const selos = { 'mais-pedido': 'Mais pedido', quentinho: 'Quentinho', novo: 'Novo' };
const produto = (nome) => categorias.flatMap((c) => c.produtos).find((p) => p.nome === nome);
const maisPedidos = ['Batata frita', 'Combo Salgaê', 'Coxinha de frango', 'Coxinha Catupiry', 'Bolinha de queijo', 'Pastel de carne', 'Brigadeiro', 'Suco natural'].map(produto);

const icones = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-6h6v6"/>',
  menu: '<rect height="16" rx="2" width="16" x="4" y="4"/><path d="M8 9h8M8 15h8"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
};
const icone = (nome, tamanho = 20) => `<svg aria-hidden="true" fill="none" height="${tamanho}" width="${tamanho}" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" viewBox="0 0 24 24">${icones[nome]}</svg>`;
const arte = (nome) => `<svg aria-hidden="true" viewBox="0 0 100 100"><use href="#i-${nome}"/></svg>`;

// Ilustrações no lugar das fotos reais (a homologação ainda não tem fotos de produto).
const sprite = `<svg class="sprite" aria-hidden="true"><defs>
  <linearGradient id="g-massa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBB751"/><stop offset="1" stop-color="#E7841C"/></linearGradient>
  <linearGradient id="g-pastel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9C973"/><stop offset="1" stop-color="#EDA23C"/></linearGradient>
  <symbol id="i-sombra" viewBox="0 0 100 100"><ellipse cx="50" cy="92" rx="28" ry="4" fill="#17110D" opacity=".12"/></symbol>
  <symbol id="i-gota" viewBox="0 0 100 100"><path d="M50 8s30 38 30 56c0 16-13 26-30 26S20 80 20 64C20 46 50 8 50 8Z" fill="url(#g-massa)" stroke="#C4650F" stroke-width="3" stroke-linejoin="round"/><path d="M36 62c0 10 5 16 13 18" fill="none" stroke="#FDE0AE" stroke-width="4" stroke-linecap="round" opacity=".85"/></symbol>
  <symbol id="i-coxinha" viewBox="0 0 100 100"><use href="#i-sombra"/><use href="#i-gota"/></symbol>
  <symbol id="i-catupiry" viewBox="0 0 100 100"><use href="#i-sombra"/><use href="#i-gota"/><circle cx="68" cy="74" r="11" fill="#FFF3D6" stroke="#C4650F" stroke-width="2.5"/></symbol>
  <symbol id="i-bolinha" viewBox="0 0 100 100"><use href="#i-sombra"/><g fill="url(#g-massa)" stroke="#C4650F" stroke-width="3"><circle cx="50" cy="38" r="19"/><circle cx="34" cy="66" r="19"/><circle cx="66" cy="66" r="19"/></g><g fill="none" stroke="#FDE0AE" stroke-width="3" stroke-linecap="round" opacity=".85"><path d="M40 36c0 5 3 9 7 10"/><path d="M24 64c0 5 3 9 7 10"/><path d="M56 64c0 5 3 9 7 10"/></g></symbol>
  <symbol id="i-pastel" viewBox="0 0 100 100"><use href="#i-sombra"/><g transform="rotate(-6 50 54)"><rect x="16" y="28" width="68" height="52" rx="9" fill="url(#g-pastel)" stroke="#C4650F" stroke-width="3"/><rect x="24" y="36" width="52" height="36" rx="5" fill="none" stroke="#C4650F" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/><path d="M36 50h10M54 60h10" stroke="#FDE9C2" stroke-width="3" stroke-linecap="round"/></g></symbol>
  <symbol id="i-risole" viewBox="0 0 100 100"><use href="#i-sombra"/><path d="M12 76a38 38 0 0 1 76 0c0 4-3 6-7 6H19c-4 0-7-2-7-6Z" fill="url(#g-pastel)" stroke="#C4650F" stroke-width="3" stroke-linejoin="round"/><path d="M22 74a28 28 0 0 1 56 0" fill="none" stroke="#C4650F" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/></symbol>
  <symbol id="i-fritas" viewBox="0 0 100 100"><use href="#i-sombra"/><g fill="#FBCB4B" stroke="#D99A14" stroke-width="2" stroke-linejoin="round"><rect x="27" y="20" width="8" height="40" rx="2" transform="rotate(-12 31 40)"/><rect x="38" y="12" width="8" height="46" rx="2" transform="rotate(-4 42 35)"/><rect x="49" y="16" width="8" height="42" rx="2" transform="rotate(5 53 37)"/><rect x="59" y="10" width="8" height="48" rx="2" transform="rotate(10 63 34)"/><rect x="67" y="24" width="8" height="36" rx="2" transform="rotate(18 71 42)"/></g><path d="M22 48h56l-7 42H29Z" fill="#DC4A1F" stroke="#A9360F" stroke-width="3" stroke-linejoin="round"/><path d="M25 62h50l-2 12H27Z" fill="#FFF6E6"/></symbol>
  <symbol id="i-bebida" viewBox="0 0 100 100"><use href="#i-sombra"/><path d="M58 30 66 8" stroke="#DC4A1F" stroke-width="4" stroke-linecap="round"/><path d="M28 34h44l-6 56H34Z" fill="#FFF6E6" stroke="#A9360F" stroke-width="3" stroke-linejoin="round"/><path d="M30 52h40l-2 18H32Z" fill="#DC4A1F"/><rect x="24" y="26" width="52" height="10" rx="4" fill="#FFF6E6" stroke="#A9360F" stroke-width="3"/></symbol>
  <symbol id="i-doce" viewBox="0 0 100 100"><use href="#i-sombra"/><circle cx="50" cy="46" r="27" fill="#5B3117" stroke="#3A1D0B" stroke-width="3"/><g stroke="#C98A4B" stroke-width="3" stroke-linecap="round"><path d="M38 34l4 4M56 30l-3 5M64 44l-5 2M44 50l5-2M34 48l3 4M54 56l4 3"/></g><path d="M20 62h60l-9 28H29Z" fill="#DC4A1F" stroke="#A9360F" stroke-width="3" stroke-linejoin="round"/><path d="M34 64l4 24M50 64v24M66 64l-4 24" stroke="#A9360F" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-combo" viewBox="0 0 100 100"><use href="#i-bebida" x="0" y="6" width="56" height="56"/><use href="#i-fritas" x="42" y="2" width="58" height="58"/><use href="#i-coxinha" x="24" y="38" width="60" height="60"/></symbol>
</defs></svg>`;

function cartao(p) {
  const selo = p.indisponivel ? '<span class="selo selo--indisponivel">INDISPONÍVEL</span>' : p.selo ? `<span class="selo selo--${p.selo}">${selos[p.selo].toUpperCase()}</span>` : '';
  return `<li><a class="cartao${p.indisponivel ? ' cartao--indisponivel' : ''}" href="#" aria-label="${p.nome}, ${p.preco}${p.indisponivel ? ', indisponível' : ''}">
    <div class="cartao__foto">${selo}${arte(p.arte)}</div>
    <div class="cartao__corpo"><h3>${p.nome}</h3><p>${p.texto}</p>
      <div class="cartao__rodape"><span class="preco">${p.preco}</span><span class="seta">${icone('arrow', 16)}</span></div>
    </div></a></li>`;
}
const faixa = (produtos, rotulo) => `<ul class="faixa" aria-label="${rotulo}">${produtos.map(cartao).join('')}</ul>`;

const topo = `<header class="topo">
  <a class="status" href="#">Aberta</a>
  <div class="marca"><img src="../../../../public/brand/salgae-logo.webp" alt="Salgaê"><span>SALGADOS QUENTES</span></div>
  <a class="botao-icone" href="#" aria-label="Informações da loja">${icone('info', 22)}</a>
</header>`;

const barra = `<nav class="barra" aria-label="Navegação">${[['home', 'Início', 'inicio'], ['menu', 'Cardápio', 'cardapio'], ['search', 'Busca'], ['info', 'Info']]
  .map(([i, rotulo, destino]) => `<a href="${destino ? `?tela=${destino}` : '#'}"${destino === tela ? ' aria-current="page"' : ''}><i>${icone(i, 22)}</i>${rotulo}</a>`).join('')}</nav>`;

const inicio = `${topo}
  <a class="busca" href="#">${icone('search')}Busque seu salgado favorito</a>
  <p class="aviso">${icone('info', 16)}Pagamento no balcão: Pix, cartão ou dinheiro.</p>
  <a class="banner" href="#">
    <svg class="banner__arte" aria-hidden="true" viewBox="0 0 100 100"><g fill="none" stroke="#FAF7EF" stroke-width="1.6" stroke-linecap="round" opacity=".35"><path d="M38 14c-4 5 4 8 0 14"/><path d="M62 10c-4 5 4 8 0 14"/></g><use href="#i-gota" x="34" y="26" width="66" height="66"/><use href="#i-gota" x="2" y="22" width="76" height="76"/></svg>
    <span class="etiqueta">DESTAQUE DA CASA</span>
    <h2>Coxinha <em>cremosa</em></h2>
    <p>Feita à mão todo dia. Quentinha saindo agora!</p>
    <span class="conferir">Conferir ${icone('arrow', 16)}</span>
    <span class="pontos" aria-hidden="true"><i></i><i></i></span>
  </a>
  <nav class="categorias" aria-label="Categorias">${categorias.map((c) => `<a href="?tela=cardapio"><span>${arte(c.arte)}</span>${c.nome}</a>`).join('')}</nav>
  <section class="secao">
    <div class="secao__titulo"><h2>Mais pedidos</h2><a class="ver-todos" href="?tela=cardapio">Ver todos ${icone('arrow', 16)}</a></div>
    ${faixa(maisPedidos, 'Mais pedidos')}
  </section>
  <a class="oferta" href="#"><small>EM DESTAQUE</small><strong>Combo do dia</strong><span>Coxinha + batata + refri por R$ 25,00</span>${arte('combo')}</a>`;

const cardapio = `${topo}
  <nav class="chips" aria-label="Categorias">${categorias.map((c, i) => `<a href="#${c.nome}"${i === 0 ? ' aria-current="true"' : ''}>${c.nome}</a>`).join('')}</nav>
  ${categorias.map((c) => `<section class="secao" id="${c.nome}">
    <div class="secao__titulo"><h2>${c.nome}</h2><small>${c.produtos.length} ${c.produtos.length === 1 ? 'item' : 'itens'}</small></div>
    ${faixa(c.produtos, c.nome)}
  </section>`).join('')}`;

document.getElementById('app').innerHTML = `${sprite}<main class="pagina">${tela === 'cardapio' ? cardapio : inicio}</main>${barra}`;

if (parametros.has('rolado')) {
  document.querySelectorAll('.faixa').forEach((f) => { f.scrollLeft = f.scrollWidth; });
}
