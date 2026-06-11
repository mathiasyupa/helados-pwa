import { NextRequest, NextResponse } from 'next/server';
import { currentToken, secondsUntilReset } from '@/lib/qr';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await currentToken();
  const secondsLeft = secondsUntilReset();
  // Auto-detect the app URL from the request (works in prod + local)
  const origin = process.env.NEXT_PUBLIC_APP_URL
    ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json({ token, secondsLeft, appUrl: origin });
}
