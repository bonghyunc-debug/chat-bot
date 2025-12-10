export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-flash-lite': { input: 0.01875, output: 0.075 },
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'gemini-3-pro-preview': { input: 1.25, output: 5.00 },
  'gemini-3-pro-image-preview': { input: 1.25, output: 5.00 },
  'gemini-2.5-flash-image': { input: 0.075, output: 0.30 },
};

const DEFAULT_MODEL = 'gemini-2.5-flash';
const KRW_RATE = 1350;

export const calculateCost = (modelId: string, inputTokens: number, outputTokens: number) => {
  const pricing = MODEL_PRICING[modelId] || MODEL_PRICING[DEFAULT_MODEL];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const total = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    total,
    krw: total * KRW_RATE,
  };
};

export const formatCost = (cost: number) => {
  if (cost < 0.01) {
    return cost.toFixed(4);
  }
  return cost.toFixed(2);
};
