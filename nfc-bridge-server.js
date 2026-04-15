/**
 * NFC Bridge Server — WebSocket relay para ACR122U + Mifare Classic 1K
 * 
 * Suporta:
 *  - Leitura automática de UID
 *  - Autenticação com chave A/B (padrão FFFFFFFFFFFF)
 *  - Leitura e escrita de blocos (16 bytes cada)
 *  - Bloco dedicado para saldo (bloco 4, setor 1)
 * 
 * === ESTRUTURA MIFARE CLASSIC 1K ===
 * 16 setores × 4 blocos = 64 blocos (blocos 0–63)
 * Cada bloco = 16 bytes
 * Bloco 0         = UID (somente leitura, gravado de fábrica)
 * Bloco 3,7,11... = Sector Trailer (chaves A/B + access bits) — NÃO ESCREVER!
 * 
 * Layout usado pelo PsyTAG:
 *   Bloco 1  = Reservado (fabricante)
 *   Bloco 2  = Reservado
 *   Bloco 3  = Sector 0 Trailer (NÃO TOCAR)
 *   Bloco 4  = SALDO (8 bytes float LE + 8 bytes checksum)
 *   Bloco 5  = METADATA (timestamp última carga, 16 bytes)
 *   Bloco 6  = CUSTOM DATA (nome curto, etc)
 *   Bloco 7  = Sector 1 Trailer (NÃO TOCAR)
 * 
 * === INSTALAÇÃO ===
 * 1. Instale Node.js (https://nodejs.org)
 * 2. Na pasta do projeto:  npm install ws nfc-pcsc
 * 3. Conecte o ACR122U via USB
 * 4. Execute:  node nfc-bridge-server.js
 * 5. No app, clique "Conectar" no card NFC Bridge
 */

const { NFC, KEY_TYPE_A, KEY_TYPE_B } = require('nfc-pcsc');
const WebSocket = require('ws');

const PORT = 8888;

// ── Configuração Mifare Classic 1K ──────────────────────────────
const DEFAULT_KEY = 'FFFFFFFFFFFF'; // chave padrão de fábrica
const KEY_TYPE = KEY_TYPE_A;

// Blocos usados pelo PsyTAG
const BLOCK_BALANCE   = 4;  // Setor 1, bloco 0 — armazena saldo
const BLOCK_METADATA  = 5;  // Setor 1, bloco 1 — timestamp/meta
const BLOCK_CUSTOM    = 6;  // Setor 1, bloco 2 — dados extras

// Blocos Sector Trailer (NUNCA escrever neles!)
const SECTOR_TRAILERS = new Set([3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63]);

// ── WebSocket Server ────────────────────────────────────────────
const wss = new WebSocket.Server({ port: PORT });
const nfc = new NFC();
const clients = new Set();
let currentReader = null;

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Cliente conectado (total: ${clients.size})`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      await handleCommand(ws, msg);
    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Cliente desconectado (total: ${clients.size})`);
  });
});

// ── Broadcast para todos os clientes ────────────────────────────
function broadcast(data) {
  const json = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

// ── Responder para um cliente específico ────────────────────────
function respond(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ── Helpers Mifare ──────────────────────────────────────────────

/** Codifica um saldo float em buffer de 16 bytes (8 bytes LE + checksum) */
function encodeBalance(value) {
  const buf = Buffer.alloc(16, 0);
  buf.writeDoubleLE(value, 0);
  // Checksum simples: soma dos primeiros 8 bytes
  let checksum = 0;
  for (let i = 0; i < 8; i++) checksum = (checksum + buf[i]) & 0xFF;
  buf.writeUInt8(checksum, 8);
  buf.writeUInt8(0xAA, 9); // marcador PsyTAG
  return buf;
}

/** Decodifica saldo de um buffer de 16 bytes */
function decodeBalance(buf) {
  if (!buf || buf.length < 10) return null;
  if (buf.readUInt8(9) !== 0xAA) return null; // não é bloco PsyTAG
  let checksum = 0;
  for (let i = 0; i < 8; i++) checksum = (checksum + buf[i]) & 0xFF;
  if (buf.readUInt8(8) !== checksum) return null; // checksum inválido
  return buf.readDoubleLE(0);
}

/** Verifica se bloco é sector trailer */
function isSectorTrailer(block) {
  return SECTOR_TRAILERS.has(block);
}

// ── Comandos recebidos via WebSocket ────────────────────────────

async function handleCommand(ws, msg) {
  const { action, block, data, key, keyType } = msg;

  if (!currentReader) {
    return respond(ws, { error: 'Nenhum leitor conectado', action });
  }

  const useKey = key || DEFAULT_KEY;
  const useKeyType = keyType === 'B' ? KEY_TYPE_B : KEY_TYPE_A;

  switch (action) {
    case 'auth': {
      const targetBlock = block ?? BLOCK_BALANCE;
      await currentReader.authenticate(targetBlock, useKeyType, useKey);
      respond(ws, { action: 'auth', success: true, block: targetBlock });
      console.log(`[CMD] Autenticação OK — bloco ${targetBlock}`);
      break;
    }

    case 'read': {
      const targetBlock = block ?? BLOCK_BALANCE;
      // Autenticar antes de ler
      await currentReader.authenticate(targetBlock, useKeyType, useKey);
      const result = await currentReader.read(targetBlock, 16, 16);
      const hex = result.toString('hex').toUpperCase();

      let payload = { action: 'read', block: targetBlock, hex, raw: [...result] };

      // Se é bloco de saldo, decodifica
      if (targetBlock === BLOCK_BALANCE) {
        const balance = decodeBalance(result);
        payload.balance = balance;
        console.log(`[CMD] Leitura bloco ${targetBlock} — saldo: R$ ${balance?.toFixed(2) ?? 'N/A'}`);
      } else {
        console.log(`[CMD] Leitura bloco ${targetBlock} — ${hex}`);
      }

      respond(ws, payload);
      break;
    }

    case 'write': {
      const targetBlock = block ?? BLOCK_BALANCE;

      if (isSectorTrailer(targetBlock)) {
        return respond(ws, {
          error: `Bloco ${targetBlock} é Sector Trailer — escrita bloqueada por segurança`,
          action: 'write',
        });
      }

      // Autenticar antes de escrever
      await currentReader.authenticate(targetBlock, useKeyType, useKey);

      let writeBuf;
      if (data && Array.isArray(data)) {
        writeBuf = Buffer.from(data);
      } else if (data && typeof data === 'string') {
        writeBuf = Buffer.from(data, 'hex');
      } else {
        return respond(ws, { error: 'Dados inválidos para escrita', action: 'write' });
      }

      // Pad to 16 bytes
      if (writeBuf.length < 16) {
        const padded = Buffer.alloc(16, 0);
        writeBuf.copy(padded);
        writeBuf = padded;
      }

      await currentReader.write(targetBlock, writeBuf, 16);
      respond(ws, { action: 'write', success: true, block: targetBlock });
      console.log(`[CMD] Escrita OK — bloco ${targetBlock}`);
      break;
    }

    case 'write_balance': {
      const value = parseFloat(msg.value);
      if (isNaN(value) || value < 0) {
        return respond(ws, { error: 'Valor de saldo inválido', action: 'write_balance' });
      }

      await currentReader.authenticate(BLOCK_BALANCE, useKeyType, useKey);
      const buf = encodeBalance(value);
      await currentReader.write(BLOCK_BALANCE, buf, 16);

      respond(ws, { action: 'write_balance', success: true, balance: value });
      console.log(`[CMD] Saldo gravado — R$ ${value.toFixed(2)}`);
      break;
    }

    case 'read_balance': {
      await currentReader.authenticate(BLOCK_BALANCE, useKeyType, useKey);
      const result = await currentReader.read(BLOCK_BALANCE, 16, 16);
      const balance = decodeBalance(result);

      respond(ws, { action: 'read_balance', balance, hex: result.toString('hex').toUpperCase() });
      console.log(`[CMD] Saldo lido — R$ ${balance?.toFixed(2) ?? 'N/A'}`);
      break;
    }

    default:
      respond(ws, { error: `Ação desconhecida: ${action}` });
  }
}

// ── NFC Reader Events ───────────────────────────────────────────

nfc.on('reader', (reader) => {
  console.log(`[NFC] Leitor detectado: ${reader.reader.name}`);
  currentReader = reader;

  reader.on('card', async (card) => {
    const uid = card.uid?.toUpperCase() || '';
    console.log(`[NFC] Tag Mifare Classic 1K — UID: ${uid}`);

    // Broadcast UID para todos os clientes
    const payload = { uid, type: card.type, atr: card.atr?.toString('hex') };

    // Tenta ler saldo automaticamente
    try {
      await reader.authenticate(BLOCK_BALANCE, KEY_TYPE, DEFAULT_KEY);
      const data = await reader.read(BLOCK_BALANCE, 16, 16);
      const balance = decodeBalance(data);
      payload.balance = balance;
      console.log(`[NFC] Saldo na tag: R$ ${balance?.toFixed(2) ?? 'não inicializado'}`);
    } catch (err) {
      console.log(`[NFC] Não foi possível ler saldo: ${err.message}`);
      payload.balance = null;
    }

    broadcast(payload);
  });

  reader.on('card.off', (card) => {
    console.log(`[NFC] Tag removida — UID: ${card.uid?.toUpperCase()}`);
    broadcast({ event: 'card_removed', uid: card.uid?.toUpperCase() });
  });

  reader.on('error', (err) => {
    console.error(`[NFC] Erro no leitor: ${err.message}`);
  });

  reader.on('end', () => {
    console.log(`[NFC] Leitor removido: ${reader.reader.name}`);
    if (currentReader === reader) currentReader = null;
  });
});

nfc.on('error', (err) => {
  console.error(`[NFC] Erro geral: ${err.message}`);
});

console.log(`
╔════════════════════════════════════════════════╗
║       NFC Bridge Server — PsyTAG v2.0         ║
║       Mifare Classic 1K Support                ║
║                                                ║
║  WebSocket: ws://localhost:${PORT}                ║
║  Aguardando leitor ACR122U...                  ║
║                                                ║
║  Blocos:                                       ║
║    4 = SALDO (float LE + checksum)             ║
║    5 = METADATA (timestamp)                    ║
║    6 = DADOS EXTRAS                            ║
║                                                ║
║  Comandos WS (JSON):                           ║
║    { action: "read_balance" }                  ║
║    { action: "write_balance", value: 100.00 }  ║
║    { action: "read",  block: 4 }               ║
║    { action: "write", block: 5, data: "hex" }  ║
║    { action: "auth",  block: 4 }               ║
║                                                ║
║  Aproxime uma tag para testar.                 ║
╚════════════════════════════════════════════════╝
`);
