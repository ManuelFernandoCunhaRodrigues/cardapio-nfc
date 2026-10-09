# Roteiro de teste no celular (H6) — para o responsável

Leva uns 10 minutos. Use **o seu celular**, de preferência **sem Wi-Fi** (só 4G/5G), para simular o cliente na lanchonete. Anote o que estranhar.

## Cliente (sem login)

1. **QR Code:** abra a câmera e aponte para o QR em `docs/qr/salgae-homologacao-vercel-app.png` (pode abrir no computador). O link deve abrir o cardápio.
2. **NFC (se tiver uma tag NTAG213/215):** grave a URL `https://salgae-homologacao.vercel.app` com o app *NFC Tools* (Escrever → Adicionar registro → URL). Encoste o celular na tag: o cardápio deve abrir.
3. A página inicial aparece em poucos segundos? O texto está legível sem dar zoom?
4. Role pelas categorias e "Mais pedidos". Toque numa categoria.
   - No **Cardápio** e em "Mais pedidos", os produtos ficam lado a lado: aparecem 2 cards inteiros e metade do 3º na borda direita? Deslize para o lado com o dedo: a faixa para alinhada no card seguinte? Preço, nome e selos aparecem inteiros? O botão laranja com a seta, no canto da foto, é fácil de tocar?
5. Abra um produto: preço, descrição e o aviso "Consulta apenas…" aparecem? Volte.
6. Use a **Busca** com uma palavra sem acento (ex.: "camarao").
7. Abra a aba **Info**: aparece aberto/fechado e os horários?

## Equipe (painel pelo celular)

8. Acesse `https://salgae-homologacao.vercel.app/admin/login` e entre com seu usuário.
9. Em **Produtos**, toque em "Indisponível" num item. Abra o cardápio em outra aba: o item aparece esmaecido? (pode levar até 1 minuto)
10. Edite um produto, troque a **foto pela câmera** e salve. O botão Salvar ficou fácil de alcançar com o polegar?
11. Volte o item para "Disponível".

## Resultado

Responda no chat: o que funcionou, o que travou ou ficou estranho, modelo do celular e navegador.
