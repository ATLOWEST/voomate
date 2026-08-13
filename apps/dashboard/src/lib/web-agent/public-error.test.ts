import { describe, expect, it } from 'vitest';
import { publicWebAgentError } from './public-error';

describe('public Web Agent errors', () => {
  it('does not describe a text throttle as an image failure', () => {
    const error = new Error('Your request rate is too high.');
    error.name = 'ThrottlingException';
    expect(publicWebAgentError(error, 0)).toEqual({
      message: 'The assistant is temporarily busy. Please try again in a moment.',
      status: 503,
      code: 'model_busy',
    });
  });

  it('retains the duplicate-billing guidance for image throttles', () => {
    const error = new Error('Throttled');
    error.name = 'ThrottlingException';
    expect(publicWebAgentError(error, 1)).toMatchObject({
      status: 503,
      code: 'model_busy',
      message: expect.stringContaining('attach the images again'),
    });
  });
});
