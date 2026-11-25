import { NextResponse } from 'next/server';
import { DEMO_ROLES, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    user,
    availableRoles: Object.values(DEMO_ROLES),
  });
}
