import { Credentials, EncryptedPayload, ModelSettings } from '../types';

/**
 * Web Crypto API Zero-Trust Encryption Engine
 * Uses PBKDF2 for key derivation and AES-GCM 256-bit for symmetrical encryption.
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM CryptoKey from master passphrase and salt
async function deriveKey(passphrase: string, saltBuffer: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts credentials and settings using Web Crypto API (AES-GCM)
 */
export async function encryptData(
  passphrase: string,
  data: { credentials: Credentials; settings: ModelSettings }
): Promise<EncryptedPayload> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this browser environment.');
  }

  // Generate 16-byte random salt and 12-byte IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const encodedData = encoder.encode(jsonString);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Decrypts encrypted payload using master passphrase
 */
export async function decryptData(
  passphrase: string,
  payload: EncryptedPayload
): Promise<{ credentials: Credentials; settings: ModelSettings }> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this browser environment.');
  }

  const saltBuffer = new Uint8Array(base64ToBuffer(payload.salt));
  const ivBuffer = new Uint8Array(base64ToBuffer(payload.iv));
  const cipherBuffer = base64ToBuffer(payload.cipherText);

  const key = await deriveKey(passphrase, saltBuffer);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  } catch {
    throw new Error('Decryption failed! Incorrect master passphrase or corrupted vault.');
  }
}
