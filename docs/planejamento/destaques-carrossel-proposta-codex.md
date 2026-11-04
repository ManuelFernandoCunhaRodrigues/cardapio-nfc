# Proposta — destaques em carrossel automático

## 1. Diagnóstico: o que já existe x o que falta de verdade

- A capacidade de cadastrar muitos destaques já existe. `public.highlights` não impõe quantidade máxima (`supabase/migrations/20261008222757_initial_schema.sql`), e as ações de criar/editar/reordenar em `app/admin/(painel)/destaques/actions.ts` também não têm limite.
- O painel lista todos os registros em `components/admin/highlights-manager.tsx`; os ativos são consultados e ordenados por `sort_order` em `lib/menu/get-public-menu.ts`.
- O validador (`lib/validators/highlight.ts`) limita apenas conteúdo: título 2–120 caracteres, descrição até 600 e destino interno seguro ou URL HTTP(S). Não há limite de itens.
- As imagens usam o bucket público `highlight-images`; as políticas do storage permitem gestão apenas a administradores (`supabase/migrations/20261009121148_media_storage.sql`). A RLS de `highlights` deixa o público ler só ativos e dá administração completa apenas a administradores.
- A home (`app/(public)/(listas)/page.tsx`) já mostra todos os ativos em faixa com `scroll-snap`, mas só por rolagem manual. Os pontos são decorativos e deixam o primeiro sempre ativo. Apenas “Conferir” é link. O segundo item ainda é repetido abaixo.
- Falta, portanto, a camada de comportamento do carrossel e seus controles acessíveis; não faltam tabela, permissões, upload nem migration.

## 2. Como vai funcionar para o cliente

- Troca automática a cada **6 segundos**, valor fixo. Dá tempo de ler título e descrição curta sem tornar a página lenta; é também mais conservador que 5 s para o conteúdo não “correr”.
- Ao chegar ao último, volta suavemente ao primeiro. Com zero/um destaque não há controles nem temporizador; sem destaque, preserva-se o banner padrão atual.
- Pausa imediatamente ao tocar/arrastar, ao passar o mouse, ao receber foco de teclado, com a aba oculta e quando o carrossel sai da tela. Retoma somente quando essas condições deixam de valer e o usuário não o pausou explicitamente.
- Com `prefers-reduced-motion: reduce`, **não avança sozinho** (concordo com Claude). A navegação manual continua disponível, sem animação suave obrigatória.
- Pontos acompanham o slide atual e serão botões clicáveis, com rótulos como “Ir para destaque 2 de 4”; isso oferece navegação direta e feedback claro.
- Setas anterior/próximo: visíveis no desktop ao foco/hover e sempre acessíveis por teclado; no celular, não exibir para não poluir — gesto de arrastar e pontos atendem melhor. Todos os alvos terão ao menos 44×44 px.
- Botão discreto de pausar/retomar: ícone 44×44 no canto do banner, sempre visível quando há mais de um item, com texto acessível “Pausar rotação automática”/“Retomar rotação automática”. Cumpre WCAG 2.2.2: conteúdo que se move sozinho por mais de 5 s precisa de mecanismo para pausar/parar/ocultar. O estado escolhido persiste enquanto a página permanecer aberta.

## 3. Como vai funcionar no painel

- `/admin/destaques` continua com criar, editar, ativar, ordenar, imagem e destino; não precisa de campo nem fluxo novo para o intervalo.
- Acrescentar no cabeçalho um contador simples: “N ativos de M destaques”.
- Acima de **8 ativos**, mostrar aviso suave: “Com muitos destaques, os últimos podem receber pouca atenção e a página pode baixar mais imagens.” Não bloquear cadastro nem impor máximo.
- A prévia atual da imagem no editor é suficiente para esta etapa; como complemento barato, indicar “posição X” e status ativo. Prévia fiel do carrossel é opcional e não recomendada agora.
- Concordo com intervalo fixo no código e **sem migration**: evita configuração difícil de explicar e não há pedido de velocidades diferentes. Rever somente se o responsável quiser autonomia para mudar esse tempo.

## 4. Faixa do segundo destaque

- Concordo em remover a faixa que repete `highlights[1]` abaixo de “Mais pedidos” em `app/(public)/(listas)/page.tsx`. Cada destaque já aparecerá no banner; a repetição ocupa espaço, cria preferência indevida pelo segundo e deixa a home mais pesada visualmente.

## 5. Técnica

- Manter o HTML e os slides renderizados no servidor, incluindo `scroll-snap`; adicionar uma pequena ilha de cliente ao novo componente de banner que o redesign irá isolar. Sem biblioteca de carrossel.
- A ilha controla índice, timer, pausa e `scrollIntoView`/rolagem do contêiner. `IntersectionObserver` identifica o slide predominante e atualiza pontos/estado; o evento de rolagem fica apenas como apoio com `requestAnimationFrame`, se necessário.
- Sem JavaScript, a faixa continua rolável manualmente por `scroll-snap`, com cada banner como link; os controles interativos não aparecem.
- Para LCP/CLS: altura fixa de 196 px conforme `docs/design/refatoracao/especificacao.md`; somente a imagem do primeiro destaque usa `priority`, as demais ficam lazy. Não pré-carregar todas.
- Manter `export const revalidate = 60` na home. As ações já revalidam o layout/caminhos após alterações.

## 6. Acessibilidade

- Contêiner com `role="region"`, `aria-roledescription="carrossel"` e rótulo “Destaques da casa”; cada item informa sua posição (“2 de 4”).
- Durante avanço automático, `aria-live="off"`: não interromper leitor de tela a cada 6 s. Após ação explícita do usuário (ponto/seta), anunciar educadamente o novo destaque em uma região `aria-live="polite"` curta.
- Ordem de foco: link do banner ativo, anterior/próximo (desktop), pontos, pausar/retomar; slides fora de vista não entram na tabulação. Nenhum foco é movido automaticamente.
- Link do banner inteiro respeita o redesign; não haverá link dentro de link. Controles ficam irmãos do link, não dentro dele.

## 7. Arquivos, migration e esforço

- Alterar na execução: componente novo de banner do redesign (nome a confirmar), `app/(public)/(listas)/page.tsx` para usá-lo e remover a faixa repetida; testes desse componente/lógica. Pode haver ajuste de estilos/ícones.
- Consultas, schema, validador, RLS, bucket e actions administrativas permanecem como estão.
- Migration: **nenhuma**.
- Esforço: **M** — comportamento pequeno, porém exige boa cobertura de pausa, foco, rolagem e acessibilidade.

## 8. Testes propostos

- Unitários, com temporizador falso: avança em 6 s; volta ao primeiro; não cria timer com 0/1 slide; pausa/retoma por hover, arraste, foco, visibilidade, fora da viewport, preferência reduzida e botão; não retoma após pausa explícita.
- Unitários: índice acompanha o slide observado; pontos e setas chamam o destino correto; renderização sem JavaScript mantém os links/scroll-snap.
- Integração: todos os ativos, na ordem `sort_order`, chegam ao banner; inativos não chegam; remoção de `highlights[1]` elimina duplicação; contador/aviso do painel em 8/9 ativos.
- Navegador (Claude): Chrome Android/iPhone simulado e desktop; arrastar, pontos, teclado Tab/Enter/Espaço, foco não roubado, hover, alternar de aba, rolar para fora/voltar, reduzir movimento do SO, 0/1/muitos destaques, imagem ausente, links internos e externos. Rodar auditoria de acessibilidade e verificar LCP/CLS no banner com várias imagens.

## 9. Riscos e perguntas para o responsável

1. **Quantos destaques pretende manter ativos?** Recomendo 3–6 e aviso após 8; é possível cadastrar mais, mas poucos clientes chegarão aos últimos.
2. **Confirma 6 segundos entre trocas?** Recomendo manter fixo inicialmente; é tempo confortável de leitura e evita uma opção extra no painel.
3. **Confirma remover a faixa “Em destaque” abaixo de Mais pedidos?** Recomendo remover, pois ela repetirá um banner que o carrossel já mostra.
4. **O botão discreto de pausar pode ficar no banner?** Recomendo sim: é necessário para acessibilidade e não interfere no visual.
