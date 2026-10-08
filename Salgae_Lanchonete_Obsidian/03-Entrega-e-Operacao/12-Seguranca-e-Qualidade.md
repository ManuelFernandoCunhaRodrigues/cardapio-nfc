---
titulo: "Segurança e qualidade"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-10-08
---
# Segurança e qualidade

Voltar: [[00-Comece-Aqui]] · Dados: [[07-Modelo-de-Dados-Supabase]]

## Controles mínimos de segurança

- Usar HTTPS em homologação e produção.
- Manter RLS ativo e revisado nas tabelas do Supabase expostas à aplicação.
- Garantir que operações de criar, editar, apagar e enviar imagens e vídeos dependam de sessão e papel autorizado.
- Aplicar rate limiting especialmente em login, recuperação de conta e endpoints administrativos.
- Validar e normalizar todo dado recebido; não confiar somente no formulário.
- Tratar upload de imagem e vídeo por tipo real, tamanho, duração e permissão.
- Guardar segredos apenas nas variáveis privadas do ambiente.
- Não expor service role, tokens ou dados administrativos no frontend.
- Registrar erros de forma segura, sem devolver detalhes internos ao visitante.
- Fazer backup e testar como restaurar dados importantes.

## Qualidade de produto

- Layout responsivo e testado principalmente no celular.
- Navegação por teclado e contraste suficiente onde aplicável.
- Textos claros, preços visíveis e feedback após salvar.
- Estados de carregamento, vazio e erro em telas públicas e administrativas.
- Proteção contra clique duplicado em operações de gravação.
- Não apagar imagem ou dado antes de confirmar a troca/transação.

## Verificações antes de merge

| Verificação | Obrigatória quando aplicável |
| --- | --- |
| Lint | Sim |
| Typecheck | Sim, se a aplicação usar TypeScript |
| Testes automatizados | Para regras de negócio, acesso e regressões críticas |
| Build de produção | Sim |
| Teste manual em celular | Sim, para alteração de interface pública |
| Revisão de permissões/RLS | Para tabelas, Storage, Auth ou painel |

## Checklist de lançamento

- [ ] URL NFC e QR Code apontam para produção, não homologação.
- [ ] Ambiente de produção usa somente credenciais de produção.
- [ ] Administrador consegue entrar e visitante não acessa o painel.
- [ ] Produto ativo aparece; produto inativo não aparece.
- [ ] Indisponibilidade segue o comportamento definido.
- [ ] Substituição de foto não quebra o cardápio nem acumula arquivo órfão.
- [ ] Vídeo de produto só carrega no detalhe, toca sem som e, se falhar, a foto continua visível.
- [ ] Cardápio abre bem em celular com rede móvel.
- [ ] Erros de formulário são compreensíveis.
- [ ] Há procedimento conhecido para rollback.
