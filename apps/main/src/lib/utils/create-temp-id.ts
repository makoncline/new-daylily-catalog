let fallbackCounter = 0;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function createUuidFromRandomValues() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    return null;
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);

  // RFC 4122 version 4 UUID bits.
  const byte6 = bytes[6]!;
  const byte8 = bytes[8]!;
  bytes[6] = (byte6 & 0x0f) | 0x40;
  bytes[8] = (byte8 & 0x3f) | 0x80;

  const hex = bytesToHex(bytes);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function createTempId(prefix = "temp") {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    createUuidFromRandomValues() ??
    `${Date.now().toString(36)}-${(++fallbackCounter).toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  return `${prefix}:${uuid}`;
}
