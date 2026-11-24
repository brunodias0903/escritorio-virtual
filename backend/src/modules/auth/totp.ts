import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

/** Codifica bytes em Base32 (RFC 4648, sem padding). */
export const base32Encode = (buf: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

/** Decodifica Base32 (RFC 4648) ignorando espaços e hífens. */
export const base32Decode = (input: string): Buffer => {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/** Gera um segredo TOTP aleatório de 160 bits em Base32. */
export const generateTotpSecret = (): string => base32Encode(randomBytes(20));

/** Monta a URI padrão otpauth:// reconhecida por Google Authenticator, Microsoft Authenticator, Authy, etc. */
export const buildOtpAuthUri = (
  email: string,
  secret: string,
  issuer = 'Escritório Virtual',
): string => {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const iss = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${iss}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
};

/** Gera um QR Code PNG (data URL) offline para o app autenticador. */
export const generateQrDataUrl = (otpauthUri: string): Promise<string> =>
  QRCode.toDataURL(otpauthUri, {
    width: 220,
    margin: 2,
    color: { dark: '#111024', light: '#ffffff' },
  });

const hotp = (secretKey: Buffer, counter: number): string => {
  const counterBuf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x1_0000_0000);
  const low = counter >>> 0;
  counterBuf.writeUInt32BE(high, 0);
  counterBuf.writeUInt32BE(low, 4);

  const hmac = createHmac('sha1', secretKey).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
};

/** Calcula o código TOTP de 6 dígitos para o instante informado (RFC 6238). */
export const generateTotpCode = (
  secret: string,
  nowMs: number = Date.now(),
): string => {
  const step = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(base32Decode(secret), step);
};

/** Valida um código TOTP de 6 dígitos com tolerância de ±1 janela de 30s. */
export const verifyTotpCode = (
  secret: string,
  rawCode: string,
  nowMs: number = Date.now(),
  window = 1,
): boolean => {
  const code = rawCode.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const baseStep = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  const received = Buffer.from(code, 'utf8');
  for (let offset = -window; offset <= window; offset++) {
    const expected = Buffer.from(hotp(key, baseStep + offset), 'utf8');
    if (
      expected.length === received.length &&
      timingSafeEqual(expected, received)
    ) {
      return true;
    }
  }
  return false;
};

// --- Criptografia do segredo em repouso (AES-256-GCM) ------------------------

const deriveAesKey = (keySeed: string): Buffer =>
  createHash('sha256').update(`setter-mfa-v1:${keySeed}`).digest();

export const encryptTotpSecret = (secret: string, keySeed: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveAesKey(keySeed), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

export const decryptTotpSecret = (
  payload: string,
  keySeed: string,
): string | null => {
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  try {
    const [ivStr, tagStr, encStr] = parts as [string, string, string];
    const decipher = createDecipheriv(
      'aes-256-gcm',
      deriveAesKey(keySeed),
      Buffer.from(ivStr, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagStr, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encStr, 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
};

// --- Códigos de recuperação (uso único) --------------------------------------

const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateRecoveryCodes = (count = 8): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let raw = '';
    for (let j = 0; j < 8; j++) {
      raw += RECOVERY_CHARS[bytes[j]! % RECOVERY_CHARS.length];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
};

export const hashRecoveryCode = (rawCode: string, keySeed: string): string => {
  const normalized = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return createHmac('sha256', deriveAesKey(keySeed))
    .update(normalized)
    .digest('hex');
};
