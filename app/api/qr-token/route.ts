import { NextRequest, NextResponse } from 'next/server';
import { currentToken, secondsUntilReset } from '@/lib/qr';
import { verifyAdminToken } from '@/lib/auth';
import { APP_URL } from '@/lib/config';

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await currentToken();
  const secondsLeft = secondsUntilReset();
  return NextResponse.json({ token, secondsLeft, appUrl: APP_URL });
}
