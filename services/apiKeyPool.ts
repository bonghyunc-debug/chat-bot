
export interface ApiKeyStatus {
  key: string;
  errorCount: number;
  lastErrorAt?: number; // timestamp(ms)
}

let apiKeyPool: ApiKeyStatus[] = [];

const ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 에러 발생 후 5분 동안은 우선순위 낮춤

export const initApiKeyPool = (keys: string[]) => {
  apiKeyPool = keys.map((k) => ({
    key: k,
    errorCount: 0,
    lastErrorAt: undefined,
  }));
};

export const getHealthyApiKey = (): string | undefined => {
  if (apiKeyPool.length === 0) return undefined;

  const now = Date.now();

  // 최근 에러가 없거나, 쿨다운이 지난 키 위주로 정렬
  const sorted = [...apiKeyPool].sort((a, b) => {
    const aCooldown =
      a.lastErrorAt && now - a.lastErrorAt < ERROR_COOLDOWN_MS ? 1 : 0;
    const bCooldown =
      b.lastErrorAt && now - b.lastErrorAt < ERROR_COOLDOWN_MS ? 1 : 0;

    if (aCooldown !== bCooldown) {
      return aCooldown - bCooldown; // 쿨다운이 아닌 키를 우선
    }

    // 에러 카운트가 적은 키를 우선
    return a.errorCount - b.errorCount;
  });

  return sorted[0]?.key;
};

export const reportApiKeyError = (key: string) => {
  const item = apiKeyPool.find((k) => k.key === key);
  if (!item) return;
  item.errorCount += 1;
  item.lastErrorAt = Date.now();
};
