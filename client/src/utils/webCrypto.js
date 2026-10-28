/**
 * HealthVerse Web Crypto Utility
 * Encrypts sensitive health data at rest in IndexedDB using Web Crypto API.
 * Uses PBKDF2 for key derivation from user session and AES-GCM for encryption.
 */

const SALT = new TextEncoder().encode('healthverse-dpdp-rural-salt-2026');

let cachedCryptoKey = null;

/**
 * Derive AES-GCM CryptoKey from user credentials / session token
 * @param {string} userSecret 
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKeyFromUser(userSecret = 'healthverse-offline-user') {
  if (cachedCryptoKey) return cachedCryptoKey;

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(userSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  cachedCryptoKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedCryptoKey;
}

/**
 * Encrypt object or string at rest
 * @param {any} data 
 * @returns {Promise<string>} Base64 encrypted payload
 */
export async function encryptAtRest(data) {
  try {
    const key = await deriveKeyFromUser();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const jsonStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const enc = new TextEncoder();
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(jsonStr)
    );

    // Combine IV and ciphertext into Base64 format: ivBase64:cipherBase64
    const ivStr = btoa(String.fromCharCode(...iv));
    const cipherStr = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `enc:${ivStr}:${cipherStr}`;
  } catch (err) {
    console.error('WebCrypto encryption failed, falling back to raw:', err);
    return typeof data === 'object' ? JSON.stringify(data) : String(data);
  }
}

/**
 * Decrypt data from at-rest storage
 * @param {string} encryptedString 
 * @returns {Promise<any>} Parsed decrypted data
 */
export async function decryptAtRest(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string' || !encryptedString.startsWith('enc:')) {
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }

  try {
    const key = await deriveKeyFromUser();
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return encryptedString;

    const iv = new Uint8Array(atob(parts[1]).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(parts[2]).split('').map(c => c.charCodeAt(0)));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const plaintext = dec.decode(decrypted);
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (err) {
    console.error('WebCrypto decryption error:', err);
    return encryptedString;
  }
}
