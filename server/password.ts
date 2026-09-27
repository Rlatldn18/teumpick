import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('hex');
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
export async function hashPassword(password: string) {
  const salt = secret();
  return `scrypt$32768$8$3$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const actual = await derive(password, parts[4]);
  const expected = Buffer.from(parts[5], 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function passwordValid(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 10 &&
    password.length <= 128
  );
}
