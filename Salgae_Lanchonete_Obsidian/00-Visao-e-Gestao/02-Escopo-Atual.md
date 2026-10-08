---
titulo: "Escopo atual"
area: Gestao
tags:
  - gestao
  - projeto
atualizado: 2026-10-08
---
# Escopo atual

Voltar: [[00-Comece-Aqui]] · Próximo: [[04-Experiencia-do-Cliente]]

## Dentro do escopo atual

- Cardápio público responsivo para celular, tablet e desktop.
- Acesso por NFC e URL/QR Code de contingência.
- Categorias, produtos, preço, descrição, foto, vídeo curto opcional e disponibilidade.
- Destaques visuais no topo do cardápio.
- Painel com login para gerenciar conteúdo.
- CRUD de categorias e produtos.
- Ativação/desativação e ordenação de itens.
- Banco de dados no Supabase/PostgreSQL.
- Armazenamento de imagens e vídeos com limpeza controlada de arquivos sem uso.
- Ambiente separado de homologação e produção.

## Fora do escopo atual

O projeto mudou de plano: ele é voltado ao atendimento **local/presencial**. Portanto, estes itens não devem ser implementados agora sem uma nova decisão:

- delivery;
- carrinho e checkout;
- cálculo de taxa de entrega;
- pagamento online/Pix pelo sistema;
- acompanhamento de entrega;
- marketplace ou múltiplas lanchonetes no mesmo painel;
- aplicativo nativo.

## Limites importantes

O NFC é uma forma de abrir a experiência; ele não substitui um QR Code nem deve ser o único meio de acesso. A URL pública precisa funcionar sem autenticação e sem exigir o aplicativo do estabelecimento.

O projeto deve nascer com base reutilizável, mas a primeira entrega é uma instalação dedicada à Salgaê. Não criar multi-tenant, cobrança por empresa ou login centralizado antes de haver necessidade real.

## Perguntas que devem ser decididas antes do lançamento

- O catálogo apenas informa ou também terá botão de chamar atendente/WhatsApp?
- Um produto indisponível deve desaparecer do público ou ficar marcado como esgotado?
- Quem terá acesso ao painel e quais permissões cada pessoa terá?
- Haverá horário de funcionamento exibido e bloqueio de visualização fora do horário?
- O cardápio precisa ter apenas português nesta etapa?

Registre as respostas em [[03-Decisoes-do-Projeto]].
