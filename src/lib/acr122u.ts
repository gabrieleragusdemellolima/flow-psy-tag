/**
 * ACR122U NFC Reader - WebUSB Driver
 * Communicates with ACR122U via WebUSB using CCID/APDU protocol.
 */

const ACR122U_VENDOR_ID = 0x072f;
const ACR122U_PRODUCT_ID = 0x2200;

// CCID message types
const PC_TO_RDR_ICCPOWERON = 0x62;
const PC_TO_RDR_XFRBLOCK = 0x6f;
const RDR_TO_PC_DATABLOCK = 0x80;

let sequenceNumber = 0;

function buildCCID(messageType: number, data: number[]): Uint8Array {
  const len = data.length;
  const msg = new Uint8Array(10 + len);
  msg[0] = messageType;
  msg[1] = len & 0xff;
  msg[2] = (len >> 8) & 0xff;
  msg[3] = (len >> 16) & 0xff;
  msg[4] = (len >> 24) & 0xff;
  msg[5] = 0x00; // slot
  msg[6] = sequenceNumber++ & 0xff;
  msg[7] = 0x00; // BWI / power select
  msg[8] = 0x00;
  msg[9] = 0x00;
  for (let i = 0; i < len; i++) msg[10 + i] = data[i];
  return msg;
}

function parseCCIDResponse(data: DataView): { status: number; payload: Uint8Array } {
  const msgType = data.getUint8(0);
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

export interface ACR122UReader {
  device: any; // USBDevice
  endpointIn: number;
  endpointOut: number;
}

export async function connectACR122U(): Promise<ACR122UReader> {
  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: ACR122U_VENDOR_ID }],
  });

  await device.open();

  // Select configuration 1
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  // Find the right interface (CCID - class 0x0B)
  const iface = device.configuration!.interfaces.find((i) =>
    i.alternates.some((a) => a.interfaceClass === 0x0b)
  );
  if (!iface) throw new Error('Interface CCID não encontrada no ACR122U');

  const ifaceNum = iface.interfaceNumber;
  await device.claimInterface(ifaceNum);

  const alternate = iface.alternates.find((a) => a.interfaceClass === 0x0b)!;
  const epIn = alternate.endpoints.find((e) => e.direction === 'in' && e.type === 'bulk');
  const epOut = alternate.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');

  if (!epIn || !epOut) throw new Error('Endpoints bulk não encontrados');

  // Power on the card slot
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

/**
 * Send APDU command GET DATA (FF CA 00 00 00) to read UID from tag.
 * Returns the UID as a hex string or null if no card is present.
 */
export async function readTagUID(reader: ACR122UReader): Promise<string | null> {
  // APDU: Get UID  ->  FF CA 00 00 00
  const apdu = [0xff, 0xca, 0x00, 0x00, 0x00];
  const ccidMsg = buildCCID(PC_TO_RDR_XFRBLOCK, apdu);

  await reader.device.transferOut(reader.endpointOut, ccidMsg);
  const result = await reader.device.transferIn(reader.endpointIn, 64);

  if (!result.data || result.data.byteLength < 12) return null;

  const parsed = parseCCIDResponse(result.data);

  // Check if card is present (status byte 0 = success)
  if (parsed.status !== 0) return null;

  // Last 2 bytes are SW1 SW2 (90 00 = success)
  if (parsed.payload.length < 3) return null;

  const sw1 = parsed.payload[parsed.payload.length - 2];
  const sw2 = parsed.payload[parsed.payload.length - 1];

  if (sw1 !== 0x90 || sw2 !== 0x00) return null;

  // UID is everything except the last 2 bytes
  const uid = parsed.payload.slice(0, parsed.payload.length - 2);
  return uidToHex(uid);
}

/**
 * Polls for a tag continuously. Calls onTag when a tag is detected.
 * Returns a cleanup function to stop polling.
 */
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
        // transfer error — card may have been removed, continue polling
        lastUid = null;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  poll();

  return () => {
    running = false;
  };
}

export function isWebUSBSupported(): boolean {
  return !!navigator.usb;
}
