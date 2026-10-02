// Autenticação do painel /admin: senha com PBKDF2 e token assinado (HMAC-SHA-256).
// Usa só Web Crypto (Workers e Node), então também roda nos testes (tools/test_admin.mjs).
//
// O hash da senha e o segredo de assinatura ficam na tabela admin_config do D1 (nunca no código
// nem no repositório). tools/setup_admin.py gera o SQL que grava os dois.

const enc = new TextEncoder();

export const PBKDF2_ITERATIONS = 100000; // teto do Workers para PBKDF2

function toB64(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const toB64Url = (buf) => toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s) => fromB64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

/** Formato: pbkdf2-sha256$<iterações>$<sal base64>$<hash base64> (o mesmo gerado por tools/setup_admin.py) */
export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PBKDF2_ITERATIONS) return false;
  try {
    const expected = fromB64(parts[3]);
    const actual = await derive(String(password), fromB64(parts[2]), iterations);
    return timingSafeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

/** Token = base64url(JSON) + "." + base64url(HMAC). payload: { exp (ms), v (versão do segredo/senha) } */
export async function signToken(secret, payload) {
  const body = toB64Url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(body));
  return `${body}.${toB64Url(sig)}`;
}

export async function verifyToken(secret, token, now = Date.now()) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), fromB64Url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body)));
    if (!payload || typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

export function randomHex(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
}
