/**
 * ACR122U NFC Reader - WebUSB Driver
 * Communicates with ACR122U via WebUSB using CCID/APDU protocol.
 * Includes Mifare Classic block read/write support.
 */

const ACR122U_VENDOR_ID = 0x072f;
const ACR122U_PRODUCT_ID = 0x2200;

const PC_TO_RDR_ICCPOWERON = 0x62;
const PC_TO_RDR_XFRBLOCK = 0x6f;

let sequenceNumber = 0;

type USBDeviceLike = any;

export interface ACR122UReader {
  device: USBDeviceLike;
  endpointIn: number;
  endpointOut: number;
}

export interface ACR122UErrorInfo {
  kind: 'access-denied' | 'not-found' | 'unsupported' | 'unknown';
  title: string;
  message: string;
  steps: string[];
}

function buildCCID(messageType: number, data: number[]): Uint8Array {
  const len = data.length;
  const msg = new Uint8Array(10 + len);
  msg[0] = messageType;
  msg[1] = len & 0xff;
  msg[2] = (len >> 8) & 0xff;
  msg[3] = (len >> 16) & 0xff;
  msg[4] = (len >> 24) & 0xff;
  msg[5] = 0x00;
  msg[6] = sequenceNumber++ & 0xff;
  msg[7] = 0x00;
  msg[8] = 0x00;
  msg[9] = 0x00;
  for (let i = 0; i < len; i++) msg[10 + i] = data[i];
  return msg;
}

function parseCCIDResponse(data: DataView): { status: number; payload: Uint8Array } {
  const dwLength = data.getUint32(1, true);
  const status = data.getUint8(7);
  const payload = new Uint8Array(dwLength);
  for (let i = 0; i < dwLength; i++) {
    payload[i] = data.getUint8(10 + i);
  }
  return { status, payload };
}

function uidToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

function getOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('mac')) return 'mac';
  return 'other';
}

export function isWebUSBSupported(): boolean {
  return !!(navigator as any).usb;
}

export function getACR122UErrorInfo(error: unknown): ACR122UErrorInfo {
  const err = error instanceof Error ? error : new Error('Erro desconhecido ao conectar o ACR122U');
  const os = getOS();

  if (!isWebUSBSupported()) {
    return {
      kind: 'unsupported',
      title: 'WebUSB não suportado neste navegador',
      message: 'Use Chrome ou Edge atualizados para conectar o ACR122U.',
      steps: ['Abra o app no Google Chrome ou Microsoft Edge.', 'Evite Firefox e Safari para este leitor.'],
    };
  }

  if (err.name === 'NotFoundError') {
    return {
      kind: 'not-found',
      title: 'Nenhum leitor selecionado',
      message: 'Você fechou a seleção do dispositivo ou não escolheu o ACR122U.',
      steps: ['Clique em Conectar Leitor novamente.', 'Selecione o dispositivo ACR122U na janela do navegador.'],
    };
  }

  if (err.name === 'SecurityError' || /access denied/i.test(err.message)) {
    if (os === 'windows') {
      return {
        kind: 'access-denied',
        title: 'Windows bloqueou o ACR122U para o navegador',
        message: 'O driver CCID/Smart Card do Windows ficou com o leitor, então o Chrome/Edge não consegue abrir o ACR122U via WebUSB.',
        steps: [
          'Feche programas da ACS e qualquer app que use smart card.',
          'Abra o Zadig como administrador.',
          'Ative Options → List All Devices.',
          'Selecione “ACR122U” ou “ACS ACR122 0”.',
          'Troque o driver para WinUSB e reconecte o leitor.',
          'Feche e abra o Chrome/Edge novamente e teste de novo.',
        ],
      };
    }

    if (os === 'linux') {
      return {
        kind: 'access-denied',
        title: 'Linux bloqueou o ACR122U para o navegador',
        message: 'O serviço pcscd ou as permissões USB estão prendendo o leitor antes do WebUSB conseguir abrir o dispositivo.',
        steps: [
          'Pare o pcscd: sudo systemctl stop pcscd',
          'Reconecte o ACR122U na USB.',
          'Abra o Chrome/Edge novamente.',
          'Se continuar, ajuste as permissões udev para o vendor 072f.',
        ],
      };
    }

    if (os === 'mac') {
      return {
        kind: 'access-denied',
        title: 'macOS bloqueou o ACR122U para o navegador',
        message: 'O sistema prendeu o leitor no driver de smart card e o WebUSB não conseguiu assumir o dispositivo.',
        steps: [
          'Feche softwares que usem smart card ou leitor ACS.',
          'Reconecte o ACR122U.',
          'Teste no Chrome/Edge.',
          'Se persistir, pode ser necessário usar outro setup de driver ou uma ponte nativa fora do navegador.',
        ],
      };
    }

    return {
      kind: 'access-denied',
      title: 'O sistema operacional negou acesso ao ACR122U',
      message: 'O navegador viu o leitor, mas o sistema não deixou o WebUSB abrir o dispositivo.',
      steps: ['Feche apps que usam o leitor.', 'Reconecte o ACR122U.', 'Teste no Chrome/Edge.', 'Se necessário, troque o driver para WinUSB ou libere o dispositivo no sistema.'],
    };
  }

  return {
    kind: 'unknown',
    title: 'Falha ao conectar o ACR122U',
    message: err.message || 'O leitor não conseguiu ser inicializado.',
    steps: ['Desconecte e conecte o leitor novamente.', 'Feche e abra o navegador.', 'Teste em outra porta USB.', 'Se persistir, verifique driver e permissões do sistema.'],
  };
}

export async function connectACR122U(): Promise<ACR122UReader> {
  const device = await (navigator as any).usb.requestDevice({
    filters: [{ vendorId: ACR122U_VENDOR_ID, productId: ACR122U_PRODUCT_ID }, { vendorId: ACR122U_VENDOR_ID }],
  });

  sequenceNumber = 0;
  await device.open();

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  const iface = device.configuration?.interfaces.find((i: any) =>
    i.alternates.some((a: any) => a.interfaceClass === 0x0b)
  );

  if (!iface) {
    throw new Error('Interface CCID não encontrada no ACR122U');
  }

  const ifaceNum = iface.interfaceNumber;
  await device.claimInterface(ifaceNum);

  const alternate = iface.alternates.find((a: any) => a.interfaceClass === 0x0b);
  const epIn = alternate?.endpoints.find((e: any) => e.direction === 'in' && e.type === 'bulk');
  const epOut = alternate?.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');

  if (!epIn || !epOut) {
    throw new Error('Endpoints bulk não encontrados no ACR122U');
  }

  const powerOn = buildCCID(PC_TO_RDR_ICCPOWERON, []);
  await device.transferOut(epOut.endpointNumber, powerOn);
  await device.transferIn(epIn.endpointNumber, 64);

  return {
    device,
    endpointIn: epIn.endpointNumber,
    endpointOut: epOut.endpointNumber,
  };
}

export async function disconnectACR122U(reader: ACR122UReader) {
  try {
    await reader.device.close();
  } catch {
    // ignore
  }
}

export async function readTagUID(reader: ACR122UReader): Promise<string | null> {
  const apdu = [0xff, 0xca, 0x00, 0x00, 0x00];
  const ccidMsg = buildCCID(PC_TO_RDR_XFRBLOCK, apdu);

  await reader.device.transferOut(reader.endpointOut, ccidMsg);
  const result = await reader.device.transferIn(reader.endpointIn, 64);

  if (!result.data || result.data.byteLength < 12) return null;

  const parsed = parseCCIDResponse(result.data);
  if (parsed.status !== 0) return null;
  if (parsed.payload.length < 3) return null;

  const sw1 = parsed.payload[parsed.payload.length - 2];
  const sw2 = parsed.payload[parsed.payload.length - 1];

  if (sw1 !== 0x90 || sw2 !== 0x00) return null;

  const uid = parsed.payload.slice(0, parsed.payload.length - 2);
  return uidToHex(uid);
}

export function pollForTag(
  reader: ACR122UReader,
  onTag: (uid: string) => void,
  intervalMs = 500
): () => void {
  let running = true;
  let lastUid: string | null = null;

  const poll = async () => {
    while (running) {
      try {
        const uid = await readTagUID(reader);
        if (uid && uid !== lastUid) {
          lastUid = uid;
          onTag(uid);
        }
        if (!uid) {
          lastUid = null;
        }
      } catch {
        lastUid = null;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  };

  void poll();

  return () => {
    running = false;
  };
}

// ── Mifare Classic APDU Commands ──────────────────────────────────

export type MifareKeyType = 'A' | 'B';

async function sendAPDU(reader: ACR122UReader, apdu: number[]): Promise<Uint8Array> {
  const ccidMsg = buildCCID(PC_TO_RDR_XFRBLOCK, apdu);
  await reader.device.transferOut(reader.endpointOut, ccidMsg);
  const result = await reader.device.transferIn(reader.endpointIn, 64);
  if (!result.data || result.data.byteLength < 12) {
    throw new Error('Resposta CCID vazia ou muito curta');
  }
  const parsed = parseCCIDResponse(result.data);
  if (parsed.status !== 0) {
    throw new Error(`Erro CCID status=${parsed.status}`);
  }
  return parsed.payload;
}

function checkSW(payload: Uint8Array, context: string) {
  if (payload.length < 2) throw new Error(`${context}: resposta muito curta`);
  const sw1 = payload[payload.length - 2];
  const sw2 = payload[payload.length - 1];
  if (sw1 !== 0x90 || sw2 !== 0x00) {
    throw new Error(`${context}: falhou (SW=${sw1.toString(16)}${sw2.toString(16)})`);
  }
}

/**
 * Load a 6-byte authentication key into the reader's volatile memory.
 * keySlot: 0x00 or 0x01
 */
export async function mifareLoadKey(
  reader: ACR122UReader,
  key: number[],
  keySlot = 0x00
): Promise<void> {
  if (key.length !== 6) throw new Error('Chave Mifare deve ter 6 bytes');
  // FF 82 00 {slot} 06 {key[0..5]}
  const apdu = [0xff, 0x82, 0x00, keySlot, 0x06, ...key];
  const resp = await sendAPDU(reader, apdu);
  checkSW(resp, 'LoadKey');
}

/**
 * Authenticate a Mifare Classic block using a previously loaded key.
 */
export async function mifareAuthenticate(
  reader: ACR122UReader,
  blockNumber: number,
  keyType: MifareKeyType = 'A',
  keySlot = 0x00
): Promise<void> {
  const keyTypeCode = keyType === 'A' ? 0x60 : 0x61;
  // FF 86 00 00 05 {01 00 block keyType keySlot}
  const apdu = [0xff, 0x86, 0x00, 0x00, 0x05, 0x01, 0x00, blockNumber, keyTypeCode, keySlot];
  const resp = await sendAPDU(reader, apdu);
  checkSW(resp, 'Authenticate');
}

/**
 * Read 16 bytes from a Mifare Classic block.
 * Must authenticate the sector first.
 */
export async function mifareReadBlock(
  reader: ACR122UReader,
  blockNumber: number
): Promise<Uint8Array> {
  // FF B0 00 {block} 10
  const apdu = [0xff, 0xb0, 0x00, blockNumber, 0x10];
  const resp = await sendAPDU(reader, apdu);
  checkSW(resp, 'ReadBlock');
  return resp.slice(0, resp.length - 2);
}

/**
 * Write 16 bytes to a Mifare Classic block.
 * Must authenticate the sector first.
 * WARNING: Do NOT write to sector trailer blocks (3, 7, 11, …) unless you know what you're doing.
 */
export async function mifareWriteBlock(
  reader: ACR122UReader,
  blockNumber: number,
  data: number[]
): Promise<void> {
  if (data.length !== 16) throw new Error('Dados para escrita devem ter exatamente 16 bytes');
  // FF D6 00 {block} 10 {data[0..15]}
  const apdu = [0xff, 0xd6, 0x00, blockNumber, 0x10, ...data];
  const resp = await sendAPDU(reader, apdu);
  checkSW(resp, 'WriteBlock');
}

/**
 * Default Mifare Classic factory key (FF FF FF FF FF FF).
 */
export const MIFARE_DEFAULT_KEY = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

/**
 * High-level: authenticate + read a block using the default key.
 */
export async function mifareReadBlockWithKey(
  reader: ACR122UReader,
  blockNumber: number,
  key: number[] = MIFARE_DEFAULT_KEY,
  keyType: MifareKeyType = 'A'
): Promise<Uint8Array> {
  await mifareLoadKey(reader, key);
  await mifareAuthenticate(reader, blockNumber, keyType);
  return mifareReadBlock(reader, blockNumber);
}

/**
 * High-level: authenticate + write a block using the default key.
 */
export async function mifareWriteBlockWithKey(
  reader: ACR122UReader,
  blockNumber: number,
  data: number[],
  key: number[] = MIFARE_DEFAULT_KEY,
  keyType: MifareKeyType = 'A'
): Promise<void> {
  await mifareLoadKey(reader, key);
  await mifareAuthenticate(reader, blockNumber, keyType);
  await mifareWriteBlock(reader, blockNumber, data);
}

/**
 * Encode a balance value (number) into a 16-byte block.
 * Format: 4-byte little-endian integer (centavos) + 4-byte inverted + 4-byte copy + 4 zeros.
 */
export function encodeBalance(reais: number): number[] {
  const centavos = Math.round(reais * 100);
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, centavos, true);
  const bytes = Array.from(new Uint8Array(buf));
  const inverted = bytes.map((b) => b ^ 0xff);
  return [...bytes, ...inverted, ...bytes, 0x00, 0x00, 0x00, 0x00];
}

/**
 * Decode a balance from a 16-byte block written by encodeBalance.
 */
export function decodeBalance(block: Uint8Array): number {
  if (block.length < 4) return 0;
  const centavos = new DataView(block.buffer, block.byteOffset).getUint32(0, true);
  return centavos / 100;
}
