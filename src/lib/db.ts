import { EncryptedPayload, VaultMetadata } from '../types';

const DB_NAME = 'ZoomNotetakerDB';
const DB_VERSION = 1;
const STORE_NAME = 'vault';
const METADATA_KEY = 'vault_meta';
const PAYLOAD_KEY = 'vault_payload';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEncryptedVault(payload: EncryptedPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const metadata: VaultMetadata = {
      isLocked: true,
      hasVault: true,
      createdAt: new Date().toISOString(),
    };

    store.put(payload, PAYLOAD_KEY);
    store.put(metadata, METADATA_KEY);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getEncryptedVault(): Promise<EncryptedPayload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(PAYLOAD_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getVaultMetadata(): Promise<VaultMetadata> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(METADATA_KEY);

      request.onsuccess = () => {
        resolve(request.result || { isLocked: true, hasVault: false });
      };
      request.onerror = () => resolve({ isLocked: true, hasVault: false });
    });
  } catch {
    return { isLocked: true, hasVault: false };
  }
}

export async function clearVault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
