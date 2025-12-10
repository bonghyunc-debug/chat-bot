// utils/crypto.ts
const ENCRYPTION_KEY_BASE = 'gemini-chat-ui-v1';
const ENCRYPTION_KEY_STORAGE = 'gemini-chat-ui-encryption-key';

const legacyKeyFromEnvironment = (): string => {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  return `${ENCRYPTION_KEY_BASE}-${btoa(userAgent.slice(0, 20))}-${language}`;
};

const generatePersistentKey = (): string => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomString = String.fromCharCode(...randomBytes);
  return `${ENCRYPTION_KEY_BASE}-${btoa(randomString)}`;
};

const getStoredEncryptionKey = (): string | null => {
  try {
    return localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  } catch {
    return null;
  }
};

const persistEncryptionKey = (key: string): void => {
  try {
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
  } catch {
    // Ignore storage failures and continue using in-memory key.
  }
};

const getOrCreateEncryptionKey = (): string => {
  const storedKey = getStoredEncryptionKey();
  if (storedKey) return storedKey;

  const newKey = generatePersistentKey();
  persistEncryptionKey(newKey);

  return newKey;
};

const xorEncrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

const xorDecrypt = (encoded: string, key: string): string => {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
};

export const encryptApiKeys = (keys: string[]): string => {
  const key = getOrCreateEncryptionKey();
  return xorEncrypt(JSON.stringify(keys), key);
};

export const decryptApiKeys = (encrypted: string): string[] => {
  if (!encrypted) return [];
  const storedKey = getStoredEncryptionKey();
  const legacyKey = legacyKeyFromEnvironment();
  const keysToTry = [storedKey, legacyKey].filter(Boolean) as string[];

  for (const candidateKey of keysToTry) {
    try {
      const decrypted = xorDecrypt(encrypted, candidateKey);
      const parsed = JSON.parse(decrypted);
      if (Array.isArray(parsed)) {
        if (!storedKey) {
          persistEncryptionKey(candidateKey);
        }
        return parsed;
      }
    } catch {
      // Continue trying other keys.
    }
  }

  // 기존 평문 데이터 마이그레이션 시도
  try {
    const parsed = JSON.parse(encrypted);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
