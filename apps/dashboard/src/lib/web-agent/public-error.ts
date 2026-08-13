import { ImageUploadError } from './images';

export interface PublicWebAgentError {
  message: string;
  status: number;
  code: 'rate_limited' | 'invalid_image' | 'model_busy' | 'request_failed';
}

function bedrockThrottled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ThrottlingException' ||
      /too many requests|request rate|throttl/i.test(error.message))
  );
}

export function publicWebAgentError(error: unknown, imageCount = 0): PublicWebAgentError {
  if (error instanceof Error && error.message === 'RATE_LIMITED') {
    return {
      message: 'Too many requests. Please try again shortly.',
      status: 429,
      code: 'rate_limited',
    };
  }
  if (error instanceof ImageUploadError) {
    return { message: error.message, status: error.status, code: 'invalid_image' };
  }
  if (bedrockThrottled(error)) {
    return {
      message:
        imageCount > 0
          ? 'Image analysis is temporarily busy. To prevent duplicate billing, attach the images again in a minute.'
          : 'The assistant is temporarily busy. Please try again in a moment.',
      status: 503,
      code: 'model_busy',
    };
  }
  return {
    message: 'The assistant could not complete that request.',
    status: 400,
    code: 'request_failed',
  };
}
