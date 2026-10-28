import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const RAW_KEY = process.env.FIELD_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
// Ensure key is exactly 32 bytes
const KEY = crypto.createHash('sha256').update(String(RAW_KEY)).digest();

/**
 * Encrypt a string or JSON object using AES-256-GCM
 * @param {string|object} data 
 * @returns {string} Encrypted format: enc:ivHex:tagHex:cipherHex
 */
export function encryptField(data) {
  if (data === null || data === undefined) return data;
  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a string if it was encrypted with encryptField
 * @param {string} data 
 * @param {boolean} parseJson If true, attempts JSON.parse on result
 * @returns {any}
 */
export function decryptField(data, parseJson = false) {
  if (!data || typeof data !== 'string' || !data.startsWith('enc:')) {
    return data;
  }
  try {
    const parts = data.split(':');
    if (parts.length !== 4) return data;
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (parseJson) {
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return data;
  }
}
