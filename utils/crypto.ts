// utils/crypto.ts
const ENCRYPTION_KEY_BASE = 'gemini-chat-ui-v1';

const getEncryptionKey = (): string => {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  return `${ENCRYPTION_KEY_BASE}-${btoa(userAgent.slice(0, 20))}-${language}`;
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
  const key = getEncryptionKey();
  return xorEncrypt(JSON.stringify(keys), key);
};

export const decryptApiKeys = (encrypted: string): string[] => {
  if (!encrypted) return [];
  const key = getEncryptionKey();
  try {
    const decrypted = xorDecrypt(encrypted, key);
    const parsed = JSON.parse(decrypted);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 기존 평문 데이터 마이그레이션 시도
    try {
      const parsed = JSON.parse(encrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
};
