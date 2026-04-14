/**
 * NFC Bridge Server — WebSocket relay para ACR122U
 * 
 * Roda localmente no Windows e conecta ao leitor ACR122U via PC/SC,
 * retransmitindo UIDs das tags por WebSocket na porta 8888.
 * 
 * === INSTALAÇÃO ===
 * 1. Instale Node.js (https://nodejs.org)
 * 2. Na pasta do projeto, execute:
 *      npm install ws nfc-pcsc
 * 3. Conecte o leitor ACR122U via USB
 * 4. Execute:
 *      node nfc-bridge-server.js
 * 5. No app, clique "Conectar" no card "NFC Bridge"
 * 
 * O servidor fica escutando tags e envia o UID via WebSocket
 * para o app React em tempo real.
 */

const { NFC } = require('nfc-pcsc');
const WebSocket = require('ws');

const PORT = 8888;
const wss = new WebSocket.Server({ port: PORT });
const nfc = new NFC();

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Cliente conectado (total: ${clients.size})`);
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Cliente desconectado (total: ${clients.size})`);
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

nfc.on('reader', (reader) => {
  console.log(`[NFC] Leitor detectado: ${reader.reader.name}`);

  reader.on('card', (card) => {
    const uid = card.uid?.toUpperCase() || '';
    console.log(`[NFC] Tag lida — UID: ${uid}`);
    broadcast({ uid, type: card.type, atr: card.atr?.toString('hex') });
  });

  reader.on('card.off', (card) => {
    console.log(`[NFC] Tag removida — UID: ${card.uid?.toUpperCase()}`);
  });

  reader.on('error', (err) => {
    console.error(`[NFC] Erro no leitor: ${err.message}`);
  });

  reader.on('end', () => {
    console.log(`[NFC] Leitor removido: ${reader.reader.name}`);
  });
});

nfc.on('error', (err) => {
  console.error(`[NFC] Erro geral: ${err.message}`);
});

console.log(`
╔══════════════════════════════════════════╗
║       NFC Bridge Server — PsyTAG        ║
║                                          ║
║  WebSocket rodando em ws://localhost:${PORT} ║
║  Aguardando leitor ACR122U...            ║
║                                          ║
║  Aproxime uma tag para testar.           ║
╚══════════════════════════════════════════╝
`);
