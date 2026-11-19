import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// scrypt, recomendado pela OWASP. Formato guardado: scrypt$N$r$p$sal$hash
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * 1024 * 1024;

const derive = (
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
};

export const verifyPassword = async (
  password: string,
  stored: string,
): Promise<boolean> => {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  const params = [Number(n), Number(r), Number(p)];
  if (params.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  try {
    const actual = await derive(
      password,
      Buffer.from(salt, 'base64'),
      params[0]!,
      params[1]!,
      params[2]!,
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
};

let dummyHash: Promise<string> | undefined;

/**
 * Gasta o mesmo tempo de uma conferência real. Usado quando o e-mail não
 * existe, para não revelar quais contas existem pelo tempo de resposta.
 */
export const verifyAgainstDummy = async (password: string): Promise<false> => {
  dummyHash ??= hashPassword('senha-que-ninguem-usa');
  await verifyPassword(password, await dummyHash);
  return false;
};
