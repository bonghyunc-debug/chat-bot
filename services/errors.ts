// services/errors.ts
export type GeminiErrorCode = 
  | 'INIT_FAILED'
  | 'STREAM_ERROR'
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'SAFETY_BLOCKED'
  | 'MODEL_OVERLOADED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class GeminiServiceError extends Error {
  public readonly code: GeminiErrorCode;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: GeminiErrorCode,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      userMessage?: string;
    }
  ) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.userMessage = options?.userMessage ?? this.getDefaultUserMessage(code);
  }

  private getDefaultUserMessage(code: GeminiErrorCode): string {
    const messages: Record<GeminiErrorCode, string> = {
      INIT_FAILED: '채팅 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.',
      STREAM_ERROR: '응답 수신 중 오류가 발생했습니다.',
      API_KEY_INVALID: '유효하지 않은 API 키입니다. 설정을 확인해주세요.',
      RATE_LIMITED: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      SAFETY_BLOCKED: '안전 필터에 의해 응답이 차단되었습니다.',
      MODEL_OVERLOADED: '현재 서버가 혼잡합니다. 잠시 후 다시 시도하거나 다른 모델을 선택해주세요.',
      NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
      UNKNOWN: '알 수 없는 오류가 발생했습니다.',
    };
    return messages[code];
  }
}

export const parseGeminiError = (error: any): GeminiServiceError => {
  const errorStr = error?.message || String(error);
  const errorJson = JSON.stringify(error);

  if (errorStr.includes('503') || errorStr.includes('overloaded') || errorJson.includes('503')) {
    return new GeminiServiceError(errorStr, 'MODEL_OVERLOADED', { statusCode: 503, retryable: true });
  }
  if (errorStr.includes('429')) {
    return new GeminiServiceError(errorStr, 'RATE_LIMITED', { statusCode: 429, retryable: true });
  }
  if (errorStr.includes('SAFETY') || errorStr.includes('Recitation')) {
    return new GeminiServiceError(errorStr, 'SAFETY_BLOCKED', { retryable: false });
  }
  if (errorStr.includes('API key') || errorStr.includes('401')) {
    return new GeminiServiceError(errorStr, 'API_KEY_INVALID', { statusCode: 401, retryable: false });
  }
  if (errorStr.includes('network') || errorStr.includes('fetch')) {
    return new GeminiServiceError(errorStr, 'NETWORK_ERROR', { retryable: true });
  }

  return new GeminiServiceError(errorStr, 'UNKNOWN');
};
