import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getRedemption, deleteRedemption } from '@/lib/store';

export async function POST(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

    const redemption = await getRedemption(code.toUpperCase());
    if (!redemption) {
      return NextResponse.json(
        { error: 'Código inválido, ya usado, o expirado (30 min)' },
        { status: 404 },
      );
    }
    await deleteRedemption(code.toUpperCase());
    return NextResponse.json({ ok: true, customerName: redemption.customerName });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
