import {checkVariant, variantKey} from './config.mjs';

const text = new TextEncoder();
const base64url = bytes => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
const bytes = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('encoding');
  const data = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), ch => ch.charCodeAt(0));
  if (base64url(data) !== value) throw new Error('encoding');
  return data;
};
const aad = meta => text.encode(`invariant-mock:1:${variantKey(meta)}`);
const key = (secret, usage) => crypto.subtle.importKey('raw', secret, 'AES-GCM', false, [usage]);

export const newCode = () => 'IM1-' + base64url(crypto.getRandomValues(new Uint8Array(16)));

export async function sealVariant(variant, code) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:aad(variant)},
    await key(bytes(code.slice(4)), 'encrypt'), text.encode(JSON.stringify(variant)));
  return {format: 1, alg: 'A128GCM', iv: base64url(iv), ciphertext: base64url(new Uint8Array(encrypted))};
}

export async function openVariant(container, meta, rawCode) {
  const code = rawCode.trim();
  if (!/^IM1-[A-Za-z0-9_-]{22}$/.test(code)) throw new Error('code');
  let decoded;
  let secret;
  try { secret = bytes(code.slice(4)); } catch { throw new Error('code'); }
  if (secret.length !== 16) throw new Error('code');
  try {
    if (container.format !== 1 || container.alg !== 'A128GCM') throw new Error();
    const iv = bytes(container.iv);
    const ciphertext = bytes(container.ciphertext);
    if (iv.length !== 12 || ciphertext.length < 17) throw new Error();
    decoded = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:aad(meta)},
      await key(secret, 'decrypt'), ciphertext);
    return checkVariant(JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(decoded)), meta);
  } catch {
    throw new Error('unlock');
  }
}
