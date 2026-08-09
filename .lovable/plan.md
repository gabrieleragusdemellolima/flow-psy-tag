# Validação: ponte NFC no PDV

## O que foi verificado

Comparei `src/pages/POS.tsx` com `src/pages/LoadTag.tsx`:

- `LoadTag.tsx` importa e usa `useNfcBridge` (WebSocket `ws://localhost:8888`), exibe o painel "NFC Bridge" (Conectar/Desconectar, status, mensagens de erro) e repassa `readerConnected={nfc.connected}` para o `IdentifyCustomer`.
- `POS.tsx` **não** importa `useNfcBridge` nem `LeitorNFC`. Ele só renderiza `IdentifyCustomer` sem `readerConnected` e sem `scanning`.

Conclusão: **o PDV não tem conexão com a ponte NFC**. Hoje só funciona por digitação manual do código da tag ou pelo botão de simulação em modo demo.

## Correção proposta

Replicar no PDV o mesmo padrão da tela de Carregar Tag:

1. Usar `useNfcBridge(handleTagRead, undefined, false)` em `POS.tsx`.
2. `handleTagRead(uid)`: define o identificador com o UID lido, busca a tag correspondente em `tags` e a define como `activeTag`, com toast e bipe curto de confirmação.
3. Adicionar o painel "NFC Bridge" (mesmo visual: ícone Wifi/WifiOff, status, botão Conectar/Desconectar, bloco de erro com as dicas da porta 8888), colapsável para não ocupar espaço no mobile — mantendo o layout atual do grid de produtos.
4. Passar `readerConnected={nfc.connected}` para o `IdentifyCustomer` do PDV, para exibir "Aproxime a tag do leitor...".

## Detalhes técnicos

- Somente `src/pages/POS.tsx` é alterado; nenhuma mudança em hook, store ou banco.
- Sem auto-conectar (`autoConnect = false`), igual ao LoadTag, para evitar tentativas de WebSocket em dispositivos sem a ponte.
- O painel fica dentro da coluna do carrinho, acima do `IdentifyCustomer`.
