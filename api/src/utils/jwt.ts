import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { RoleName } from '../config/constants';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  roles: RoleName[];
  employeeId: string | null;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // unique token id (matched against RefreshToken table)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** SHA-256 hash for storing refresh / reset tokens at rest (never store raw). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Cryptographically-random opaque token (used for password reset links). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
