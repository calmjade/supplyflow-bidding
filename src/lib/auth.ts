import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { DemoRoleKey, SessionUser } from '@/types';

export const SESSION_COOKIE_NAME = 'sf_session';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'supplyflow-bidding-hmac-secret-2026-calmjade';

export const DEMO_ROLES: Record<DemoRoleKey, SessionUser> = {
  buyer: {
    key: 'buyer',
    id: 'buyer-caojie',
    name: '曹杰 · 集团战略采购部',
    role: 'BUYER',
    company: '集团战略采购部',
    badge: '采购总监 · 招采主持',
  },
  'supplier-a': {
    key: 'supplier-a',
    id: 'sup-haizhi',
    name: '青岛海智精密制造有限公司',
    role: 'SUPPLIER',
    company: '青岛海智精密制造有限公司',
    badge: 'AAA 级核心供应商',
  },
  'supplier-b': {
    key: 'supplier-b',
    id: 'sup-yunlian',
    name: '苏州云联工业科技有限公司',
    role: 'SUPPLIER',
    company: '苏州云联工业科技有限公司',
    badge: 'AA 级优选供应商',
  },
};

export function isValidRoleKey(value: unknown): value is DemoRoleKey {
  return typeof value === 'string' && value in DEMO_ROLES;
}

export function signSessionToken(roleKey: DemoRoleKey): string {
  const payload = JSON.stringify({
    roleKey,
    iat: Date.now(),
  });
  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as { roleKey?: unknown };
    if (isValidRoleKey(parsed.roleKey)) {
      return DEMO_ROLES[parsed.roleKey];
    }
  } catch {
    return null;
  }
  return null;
}

export async function getCurrentUser(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const verified = verifySessionToken(token);
  return verified ?? DEMO_ROLES.buyer;
}
