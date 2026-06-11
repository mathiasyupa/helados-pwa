import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';
import { ADMIN_PASSWORD } from '@/lib/config';
import { isLoginBlocked, recordLoginFail, clearLoginFails } from '@/lib/store';

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  if (!ADMIN_PASSWORD) {
    console.error('[auth] ADMIN_PASSWORD is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const ip = clientIp(req);
  if (await isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 },
    );
  }

  const { password } = await req.json();
  if (!password || password !== ADMIN_PASSWORD) {
    await recordLoginFail(ip);
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  await clearLoginFails(ip);
  const token = await signAdminToken();
  return NextResponse.json({ token });
}
