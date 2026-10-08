---
titulo: "Painel administrativo"
area: Produto
tags:
  - produto
  - experiencia
atualizado: 2026-10-08
---
# Painel administrativo

Voltar: [[00-Comece-Aqui]] · Base técnica: [[06-Arquitetura-e-Stack]]

## Finalidade

O painel é o local seguro onde a equipe administra o conteúdo que aparece no cardápio. A pessoa não deve precisar editar código, publicar manualmente uma nova versão ou conhecer o banco de dados para atualizar itens.

## Módulos do MVP

### Autenticação

- Login para usuários autorizados.
- Encerramento de sessão e recuperação segura de acesso.
- Mensagens neutras em falha de login, sem revelar se um e-mail existe.

### Dashboard simples

- resumo de produtos ativos, indisponíveis e sem foto;
- atalhos para cadastrar produto e categoria;
- avisos que ajudem a manter o cardápio completo.

### Categorias

- criar, editar, ordenar, ativar e desativar;
- impedir exclusão perigosa de categoria que ainda possui produtos, oferecendo migração ou confirmação explícita;
- manter um identificador estável para URLs e integrações internas.

### Produtos

- nome, preço, descrição, categoria, imagem, vídeo curto opcional, ordem, ativo e disponibilidade;
- validação antes de salvar;
- prévia do que será mostrado no cardápio;
- confirmação antes de ações irreversíveis;
- envio, prévia, troca e remoção do vídeo do produto, com aviso claro dos limites (formato, duração e tamanho);
- remoção ou substituição segura da imagem ou do vídeo antigo, conforme [[08-Imagens-e-Storage]].

### Destaques

- cadastrar arte, título, texto opcional, destino e ordem de exibição;
- ativar/desativar sem apagar o histórico;
- validar tamanho e formato da imagem para não prejudicar a página pública.

### Dados da loja

- editar nome, frase, endereço, link do mapa, telefone, WhatsApp e Instagram;
- horário de funcionamento por dia da semana, com opção de dia fechado;
- abrir ou fechar a loja manualmente, sobrepondo o horário (ex.: feriado);
- aviso curto opcional exibido no cardápio (ex.: "Hoje fechamos às 15h");
- cada alteração fica registrada na auditoria.

## Permissões iniciais

Começar com o menor número de papéis possível: **administrador**. Se outra pessoa passar a editar somente produtos, criar papel **editor** com permissões limitadas. As regras devem ser aplicadas no banco, não apenas escondidas na interface.

## Critério de pronto

Uma pessoa autorizada consegue alterar um preço ou marcar um item indisponível, confirmar a alteração e vê-la refletida no cardápio público sem expor funções administrativas ao visitante.
