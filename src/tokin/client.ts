import type { Payload, Token } from ".";

export const SIGNATURE_LENGTH = 43 as const;

export function read<T = unknown>(token: Token<T>): Payload<T> | null {
  try {
    return JSON.parse(atob(token.slice(SIGNATURE_LENGTH)));
  } catch {
    return null;
  }
}
