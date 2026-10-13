---
titulo: "Ambientes e deploy"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-10-10
---
# Ambientes e deploy

Voltar: [[00-Comece-Aqui]] · Fluxo de código: [[10-Git-e-Fluxo-de-Entrega]]

## Separação obrigatória

> **Nomes dos ambientes (2026-10-10):** o projeto passa a usar três nomes — **desenvolvimento** (a máquina de quem programa, com `npm run dev`, apontando para o banco de stage), **stage** (antes chamado de "homologação": Supabase `SALGAE-STAGING` + projeto Vercel `salgae-homologacao`, branch `develop`; cada PR gera um deploy de preview) e **produção** (Supabase `SALGAE-PRODUCTION` + projeto Vercel `salgae-producao`, branch `main`). Onde este vault disser "homologação", leia "stage".

O projeto terá dois ambientes reais e isolados, cada um com seu projeto Vercel e seu projeto Supabase.

| Ambiente | Branch principal | Projeto Vercel | Projeto Supabase | Finalidade |
| --- | --- | --- | --- | --- |
| Homologação | `develop` | Salgaê — Homologação | `SALGAE-STAGING` | Testes técnicos, revisão visual e validação da operação. |
| Produção | `main` | Salgaê — Produção | `SALGAE-PRODUCTION` | Cardápio efetivamente usado pelos clientes. |

> Os nomes exatos podem mudar no provedor, mas a separação deve permanecer.

## Projetos Supabase provisionados

Criados em 2026-10-08 na organização **Salgaê Lanchonete** (plano Free), região `sa-east-1` (São Paulo).

| Ambiente | Projeto | Ref | URL da API |
| --- | --- | --- | --- |
| Homologação | `SALGAE-STAGING` | `csirmtmerqpbhatruzaf` | `https://csirmtmerqpbhatruzaf.supabase.co` |
| Produção | `SALGAE-PRODUCTION` | `gqwtjrdfnkfitslolofg` | `https://gqwtjrdfnkfitslolofg.supabase.co` |

O projeto antigo `xjvibtlnesfzvdyjhivg` (criado automaticamente, em `us-east-1`) está pausado e não faz parte do fluxo.

> No plano Free, projetos sem atividade por cerca de 7 dias são pausados automaticamente. Antes do lançamento, avaliar o plano Pro para `SALGAE-PRODUCTION`, já que um cardápio pausado deixa de abrir para o cliente.

## Por que dois projetos Vercel

Não será usado apenas um preview temporário da mesma aplicação. Cada ambiente tem URL, variáveis, banco e regras próprios. Isso permite a equipe testar uma atualização sem criar ou alterar produtos reais e sem risco de o NFC do estabelecimento apontar para uma versão em avaliação.

## Variáveis de ambiente

Cada projeto Vercel deve receber apenas as chaves do seu ambiente:

- URL do Supabase correspondente;
- chave pública/anon permitida ao frontend;
- configurações de URL pública e autenticação;
- `NEXT_PUBLIC_SITE_ENV`: `production` somente no projeto de produção. Ausente ou com outro valor, o site se comporta como homologação e bloqueia a indexação (`robots.txt` com `Disallow: /` e `noindex`);
- `NEXT_PUBLIC_SITE_URL`: endereço público do ambiente, usado como base dos metadados;
- qualquer segredo de servidor somente no ambiente privado.

Nunca copiar arquivo `.env` de produção para homologação sem revisar cada valor. Nunca commitar `.env` ou segredo no Git.

## Processo de publicação

1. Implementar em branch `feat/...`.
2. Integrar em `develop`.
3. O Vercel de homologação publica automaticamente.
4. Validar fluxo público, painel, dados e imagens em homologação.
5. Abrir PR de `develop` para `main`.
6. Se houver migration nova, aplicá-la em produção pelo workflow **Migrations** do GitHub Actions antes do merge; o PR fica reprovado enquanto a produção não a tiver (`docs/migrations-pelo-ci.md`). No stage a migration é aplicada sozinha no merge na `develop`.
7. Após revisão e aprovação, merge em `main` publica a produção.
8. Executar checklist pós-publicação e registrar resultado.

## Recuperação

Se uma versão em produção falhar, restaurar o deploy anterior conhecido como estável e investigar em homologação. Uma correção de urgência ainda deve entrar no Git, ser validada no mínimo necessário e posteriormente sincronizada com `develop`.
