import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'gemini_api_keys';

export const useApiKeys = () => {
  const [apiKeys, setApiKeysState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  const addApiKey = useCallback((key: string) => {
    setApiKeysState(prev => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const removeApiKey = useCallback((indexOrKey: number | string) => {
    setApiKeysState(prev => {
      if (typeof indexOrKey === 'number') {
        return prev.filter((_, i) => i !== indexOrKey);
      }
      return prev.filter(k => k !== indexOrKey);
    });
  }, []);

  const getActiveKey = useCallback(() => {
    return apiKeys[0];
  }, [apiKeys]);

  const rotateKey = useCallback(() => {
    setApiKeysState(prev => {
      if (prev.length <= 1) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  }, []);

  return {
    apiKeys,
    addApiKey,
    removeApiKey,
    getActiveKey,
    rotateKey,
  };
};
