import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/qr';
import { getCustomer, addStamps, isRateLimited, createRedemption, consumeGrant } from '@/lib/store';
import { randomCode } from '@/lib/codes';
import { STAMPS_REQUIRED } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { token, grant, customerId } = await req.json();

    if ((!token && !grant) || !customerId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Check customer exists
    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    let stampsToAdd = 1;
    let bypassRateLimit = false;

    if (grant) {
      // Cashier-issued single-use QR: N stamps, no rate limit (the cashier authorized it)
      const g = await consumeGrant(String(grant).toUpperCase());
      if (!g) {
        return NextResponse.json(
          { error: 'Este QR ya fue usado o expiró. Pide al cajero que genere otro.' },
          { status: 400 },
        );
      }
      stampsToAdd = g.stamps;
      bypassRateLimit = true;
    } else {
      // Rotating kiosk QR: verify HMAC + expiry
      const valid = await verifyToken(token);
      if (!valid) {
        return NextResponse.json(
          { error: 'QR expirado o inválido. Pide al cajero que refresque el QR.' },
          { status: 400 },
        );
      }
      // Rate limit: 1 sello cada 2 horas por cliente
      if (await isRateLimited(customerId)) {
        return NextResponse.json(
          { error: 'Ya ganaste un sello recientemente. Si compraste de nuevo, pide al cajero un QR de compra.' },
          { status: 429 },
        );
      }
    }

    const { customer: updated, justCompleted } = await addStamps(customerId, stampsToAdd, {
      rateLimit: !bypassRateLimit,
    });

    // If card just completed → create redemption code
    let code: string | undefined;
    if (justCompleted) {
      code = randomCode();
      await createRedemption(code, customerId, customer.name);
    }

    return NextResponse.json({
      stamps: updated.stamps,
      totalCompleted: updated.totalCompleted,
      stampsRequired: STAMPS_REQUIRED,
      stampsAdded: stampsToAdd,
      justCompleted,
      code,
    });
  } catch (e) {
    console.error('[scan]', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
