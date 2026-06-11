import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { createGrant } from '@/lib/store';
import { randomCode } from '@/lib/codes';
import { MAX_GRANT_STAMPS } from '@/lib/config';

export async function POST(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { stamps } = await req.json();
    const n = Number(stamps);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GRANT_STAMPS) {
      return NextResponse.json(
        { error: `Cantidad inválida (1-${MAX_GRANT_STAMPS})` },
        { status: 400 },
      );
    }
    const code = randomCode(8);
    await createGrant(code, n);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    return NextResponse.json({ code, stamps: n, url: `${appUrl}/scan?g=${code}`, expiresInSeconds: 600 });
  } catch (e) {
    console.error('[grant]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
