import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateQrDataUrl,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from './totp.js';

describe('totp', () => {
  it('codifica e decodifica Base32 fielmente', () => {
    const raw = Buffer.from('12345678901234567890', 'utf8');
    const encoded = base32Encode(raw);
    expect(encoded).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(encoded).equals(raw)).toBe(true);
  });

  it('gera e valida código TOTP RFC 6238 com tolerância de janela ±1', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = generateTotpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(verifyTotpCode(secret, code, now + 30_000)).toBe(true);
    expect(verifyTotpCode(secret, code, now - 30_000)).toBe(true);
    expect(verifyTotpCode(secret, code, now + 120_000)).toBe(false);
    expect(verifyTotpCode(secret, 'abc', now)).toBe(false);
  });

  it('criptografa e descriptografa o segredo com AES-256-GCM', () => {
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret, 'my-session-secret');
    expect(enc).not.toContain(secret);
    expect(decryptTotpSecret(enc, 'my-session-secret')).toBe(secret);
    expect(decryptTotpSecret(enc, 'wrong-key')).toBeNull();
    expect(decryptTotpSecret('malformed', 'my-session-secret')).toBeNull();
  });

  it('gera URI otpauth, QR data URL e códigos de recuperação únicos', async () => {
    const secret = generateTotpSecret();
    const uri = buildOtpAuthUri('user@setter.app', secret);
    expect(uri).toContain('otpauth://totp/Escrit%C3%B3rio%20Virtual');
    expect(uri).toContain(`secret=${secret}`);

    const qr = await generateQrDataUrl(uri);
    expect(qr.startsWith('data:image/png;base64,')).toBe(true);

    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(codes[0]).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(hashRecoveryCode(codes[0]!, 'seed')).toBe(
      hashRecoveryCode(codes[0]!.replace('-', '').toLowerCase(), 'seed'),
    );
  });
});
