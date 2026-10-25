import { first } from './params';

/** Only these callback params are read; everything else in the URL is ignored. */
export interface CallbackParams {
  code: string | null;
  flow: 'signup' | 'recovery';
  hasError: boolean;
  errorCode: string | null;
}

const CODE = /^[A-Za-z0-9._~-]{1,512}$/;

export function parseCallbackParams(raw: Record<string, string | string[] | undefined>): CallbackParams {
  const code = first(raw.code);
  const flow = first(raw.flow) === 'recovery' ? 'recovery' : 'signup';
  const errorCode = first(raw.error_code) ?? null;
  const hasError = !!(first(raw.error) || errorCode || first(raw.error_description));
  return { code: code && CODE.test(code) ? code : null, flow, hasError, errorCode };
}
