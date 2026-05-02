import { SIGNATURE_LENGTH, read } from "./client";
import type { Payload, Hasher, Token } from ".";

import { timingSafeEqual } from "node:crypto";

const SCHEME = "base64url" as const;

export function payload<T>(data: T, iat: number, ttl: number): Payload<T> {
  return { ...data, iat, exp: iat + ttl };
}

export function hasher(secret: string): Hasher {
  return new Bun.CryptoHasher("sha256", secret);
}

export function sign<T>(payload: Payload<T>, hasher: Hasher): Token<T> {
  const data = Buffer.from(JSON.stringify(payload)).toString(SCHEME);
  const local_hasher = hasher.copy();

  local_hasher.update(data);

  const digest = local_hasher.digest(SCHEME);
  console.assert(digest.length === SIGNATURE_LENGTH);

  return digest + data;
}

export function verify<T = unknown>(token: Token<T>, hasher: Hasher): Payload<T> | null {
  const sign = token.slice(0, SIGNATURE_LENGTH);
  const data = token.slice(SIGNATURE_LENGTH);

  const local_hasher = hasher.copy();

  local_hasher.update(data);

  const expected = Buffer.from(local_hasher.digest(SCHEME), SCHEME);
  const provided = Buffer.from(sign, SCHEME);

  console.assert(expected.length === provided.length);

  if (!timingSafeEqual(expected, provided)) return null;

  return read<T>(token);
}
