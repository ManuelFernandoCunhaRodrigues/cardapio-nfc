---
titulo: "Arquitetura e stack"
area: Tecnologia
tags:
  - tecnologia
  - arquitetura
atualizado: 2026-09-26
---
# Arquitetura e stack

Voltar: [[00-Comece-Aqui]] · Deploy: [[09-Ambientes-e-Deploy]]

## Arquitetura em alto nível

```mermaid
flowchart TD
  Cliente[Cliente com NFC ou QR] --> Publico[Cardápio público]
  Equipe[Equipe autorizada] --> Painel[Painel administrativo]
  Publico --> Supabase[Supabase]
  Painel --> Supabase
  Supabase --> Banco[(PostgreSQL)]
  Supabase --> Storage[Storage de imagens]
```

O cardápio público lê apenas dados permitidos. O painel escreve mediante sessão autenticada e políticas de autorização. O Supabase é a fonte de verdade de dados e imagens.

## Tecnologias definidas

| Camada | Tecnologia | Uso |
| --- | --- | --- |
| Banco de dados | Supabase PostgreSQL | Produtos, categorias, destaques, usuários e auditoria. |
| Autenticação | Supabase Auth | Sessões e identidade dos usuários administrativos. |
| Arquivos | Supabase Storage | Fotos de produtos e artes de destaque. |
| Hospedagem | Vercel | Aplicação web, com projetos independentes por ambiente. |
| Controle de versão | Git/GitHub | Histórico, revisão e fluxo entre `develop` e `main`. |

## Base de aplicação recomendada

Para uma aplicação única com área pública e painel, a base recomendada é **Next.js com TypeScript**, estilização com **Tailwind CSS** e validação com **Zod**. Isso ainda deve ser confirmado como decisão final antes de iniciar a implementação; se outra stack for escolhida, atualize [[03-Decisoes-do-Projeto]].

O motivo da recomendação é manter interface, rotas protegidas, validação e deploy no mesmo projeto, sem introduzir servidor próprio onde ele não é necessário no MVP.

## Princípios técnicos

- Nunca colocar chaves administrativas do Supabase no navegador.
- Separar funções públicas, administrativas e sensíveis.
- Validar no cliente para orientar o usuário e no servidor/banco para garantir integridade.
- Tratar operações de imagem e exclusão como ações com verificação.
- Usar tipagem e regras de domínio para preço, ordenação e disponibilidade.
- Preferir componentes acessíveis e responsivos desde a primeira tela.

## Integrações futuras possíveis

WhatsApp, chamada de atendente, métricas e pedido digital podem ser adicionados depois como módulos. Eles não devem moldar a arquitetura atual a ponto de atrasar o cardápio local.
