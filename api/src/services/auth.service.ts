import prisma from '../config/prisma';
import { env } from '../config/env';
import { MODULES, type RoleName } from '../config/constants';
import {
  hashToken,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { badRequest, unauthorized } from '../utils/errors';
import { writeAudit } from '../utils/audit';

interface Ctx {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Load a user with role names + linked employee id. */
async function loadUserWithRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } }, employee: { select: { id: true } } },
  });
}

function roleNames(userRoles: { role: { name: RoleName } }[]): RoleName[] {
  return userRoles.map((ur) => ur.role.name);
}

async function issueTokens(
  user: { id: string; email: string },
  roles: RoleName[],
  employeeId: string | null,
  ctx: Ctx,
) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles, employeeId });

  const jti = randomToken(16);
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  // 7 days default — store only the hash
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      createdByIp: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });

  return { accessToken, refreshToken };
}

export function sanitizeUser(user: {
  id: string;
  email: string;
  isActive: boolean;
  userRoles: { role: { name: RoleName } }[];
  employee?: { id: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    roles: roleNames(user.userRoles),
    employeeId: user.employee?.id ?? null,
  };
}

export async function register(
  input: { fullName: string; email: string; password: string; company?: string; phone?: string },
  ctx: Ctx,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest('An account with this email already exists', 'EMAIL_TAKEN');

  const clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
  if (!clientRole) throw badRequest('Client registration is not available', 'NO_CLIENT_ROLE');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      userRoles: { create: [{ roleId: clientRole.id }] },
      clientProfile: {
        create: { fullName: input.fullName, company: input.company, phone: input.phone },
      },
    },
    include: { userRoles: { include: { role: true } }, employee: { select: { id: true } } },
  });

  const tokens = await issueTokens(user, ['CLIENT'], null, ctx);
  await writeAudit({
    userId: user.id,
    action: 'REGISTER',
    module: MODULES.AUTH,
    description: `Client self-registered: ${input.email}`,
    ...ctx,
  });

  return { ...tokens, user: sanitizeUser(user) };
}

export async function login(email: string, password: string, ctx: Ctx) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { userRoles: { include: { role: true } }, employee: { select: { id: true } } },
  });

  if (!user) {
    await writeAudit({
      action: 'FAILED_LOGIN',
      module: MODULES.AUTH,
      description: `Login failed for ${email} (no such user)`,
      ...ctx,
    });
    throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    await writeAudit({
      userId: user.id,
      action: 'FAILED_LOGIN',
      module: MODULES.AUTH,
      description: 'Login blocked: account deactivated',
      ...ctx,
    });
    throw unauthorized('Your account is deactivated. Contact your administrator.', 'ACCOUNT_DISABLED');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    await writeAudit({
      userId: user.id,
      action: 'FAILED_LOGIN',
      module: MODULES.AUTH,
      description: 'Login failed: wrong password',
      ...ctx,
    });
    throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const roles = roleNames(user.userRoles);
  const employeeId = user.employee?.id ?? null;
  const tokens = await issueTokens(user, roles, employeeId, ctx);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    userId: user.id,
    employeeId,
    action: 'LOGIN',
    module: MODULES.AUTH,
    description: 'User logged in',
    ...ctx,
  });

  return { ...tokens, user: sanitizeUser(user) };
}

export async function refresh(rawToken: string | undefined, ctx: Ctx) {
  if (!rawToken) throw unauthorized('Refresh token missing', 'NO_REFRESH_TOKEN');

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw unauthorized('Refresh token is no longer valid', 'INVALID_REFRESH_TOKEN');
  }

  const user = await loadUserWithRoles(payload.sub);
  if (!user || !user.isActive) throw unauthorized('Account unavailable', 'ACCOUNT_DISABLED');

  const roles = roleNames(user.userRoles);
  const employeeId = user.employee?.id ?? null;

  // Rotate: revoke the old token, issue a fresh pair
  const tokens = await issueTokens(user, roles, employeeId, ctx);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedBy: hashToken(tokens.refreshToken) },
  });

  return { ...tokens, user: sanitizeUser(user) };
}

export async function logout(rawToken: string | undefined, userId?: string, ctx: Ctx = {}) {
  if (rawToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  if (userId) {
    await writeAudit({ userId, action: 'LOGOUT', module: MODULES.AUTH, description: 'User logged out', ...ctx });
  }
}

export async function forgotPassword(email: string, ctx: Ctx) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same to avoid user enumeration
  if (!user || !user.isActive) return { token: null };

  const rawToken = randomToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  await writeAudit({
    userId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    module: MODULES.AUTH,
    description: 'Password reset requested',
    ...ctx,
  });

  // In production: email the link. In dev: return token so it can be tested.
  return { token: env.NODE_ENV === 'production' ? null : rawToken };
}

export async function resetPassword(token: string, newPassword: string, ctx: Ctx) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('Reset link is invalid or has expired', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Revoke all active sessions for safety
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await writeAudit({
    userId: record.userId,
    action: 'PASSWORD_RESET',
    module: MODULES.AUTH,
    description: 'Password was reset',
    ...ctx,
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ctx: Ctx,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized('User not found');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await writeAudit({
    userId,
    action: 'PASSWORD_CHANGED',
    module: MODULES.AUTH,
    description: 'User changed password',
    ...ctx,
  });
}

export async function me(userId: string) {
  const user = await loadUserWithRoles(userId);
  if (!user) throw unauthorized('User not found');
  return sanitizeUser(user);
}
