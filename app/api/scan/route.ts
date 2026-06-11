import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/qr';
import { getCustomer, addStamp, isRateLimited, createRedemption } from '@/lib/store';
import { STAMPS_REQUIRED } from '@/lib/config';

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const { token, customerId } = await req.json();

    if (!token || !customerId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Verify QR token (HMAC + expiry)
    const valid = await verifyToken(token);
    if (!valid) {
      return NextResponse.json(
        { error: 'QR expirado o inválido. Pide al cajero que refresque el QR.' },
        { status: 400 },
      );
    }

    // 2. Check customer exists
    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 3. Rate limit: 1 sello cada 2 horas por cliente
    if (await isRateLimited(customerId)) {
      return NextResponse.json(
        { error: 'Ya ganaste un sello recientemente. ¡Vuelve pronto!' },
        { status: 429 },
      );
    }

    // 4. Add stamp
    const { customer: updated, justCompleted } = await addStamp(customerId);

    // 5. If card just completed → create redemption code
    let code: string | undefined;
    if (justCompleted) {
      code = randomCode();
      await createRedemption(code, customerId, customer.name);
    }

    return NextResponse.json({
      stamps: updated.stamps,
      totalCompleted: updated.totalCompleted,
      stampsRequired: STAMPS_REQUIRED,
      justCompleted,
      code,
    });
  } catch (e) {
    console.error('[scan]', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
