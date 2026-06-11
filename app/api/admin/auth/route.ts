import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';
import { ADMIN_PASSWORD } from '@/lib/config';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const token = await signAdminToken();
  return NextResponse.json({ token });
}
