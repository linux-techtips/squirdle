declare const __phantom: unique symbol;

export type Hasher = Bun.CryptoHasher;
export type Token<T = unknown> = string & { readonly [__phantom]?: T };

export type Payload<T = unknown> = T & {
  iat: number,
  exp: number,
};

export { payload, hasher, verify, sign } from "./server";
export { read } from "./client";
