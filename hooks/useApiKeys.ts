// hooks/useApiKeys.ts
import { useState, useCallback, useEffect } from 'react';
import { encryptApiKeys, decryptApiKeys } from '../utils/crypto';
import { initApiKeyPool, getHealthyApiKey } from '../services/apiKeyPool';

const STORAGE_KEY = 'gemini_api_keys_enc';
const LEGACY_KEY = 'gemini_api_keys';

export const useApiKeys = () => {
  const [apiKeys, setApiKeysState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return decryptApiKeys(saved);
      }
      // 기존 평문 데이터 마이그레이션
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const keys = JSON.parse(legacy);
        localStorage.removeItem(LEGACY_KEY);
        return Array.isArray(keys) ? keys : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // API 키 풀 초기화
  useEffect(() => {
    initApiKeyPool(apiKeys);
  }, [apiKeys]);

  // localStorage 동기화
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, encryptApiKeys(apiKeys));
  }, [apiKeys]);

  const addApiKey = useCallback((key: string) => {
    setApiKeysState(prev => {
      if (prev.includes(key)) return prev;
      return [...prev, key];
    });
  }, []);

  const removeApiKey = useCallback((key: string) => {
    setApiKeysState(prev => prev.filter(k => k !== key));
  }, []);

  const getActiveKey = useCallback(() => {
    return getHealthyApiKey();
  }, []);

  return {
    apiKeys,
    addApiKey,
    removeApiKey,
    getActiveKey
  };
};
