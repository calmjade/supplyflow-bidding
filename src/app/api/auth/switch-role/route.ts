import { NextResponse } from 'next/server';
import {
  DEMO_ROLES,
  SESSION_COOKIE_NAME,
  isValidRoleKey,
  signSessionToken,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { roleKey?: unknown };
    if (!isValidRoleKey(body.roleKey)) {
      return NextResponse.json(
        { error: '无效的演示角色标识，可选: buyer / supplier-a / supplier-b' },
        { status: 400 }
      );
    }

    const user = DEMO_ROLES[body.roleKey];
    const token = signSessionToken(body.roleKey);

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
