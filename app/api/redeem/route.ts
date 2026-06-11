import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, createRedemption } from '@/lib/store';
import { randomCode } from '@/lib/codes';
import { STAMPS_REQUIRED } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });

    const customer = await getCustomer(customerId);
    if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    if (customer.stamps < STAMPS_REQUIRED) {
      return NextResponse.json({ error: 'Tarjeta incompleta' }, { status: 400 });
    }

    const code = randomCode();
    await createRedemption(code, customerId, customer.name);
    return NextResponse.json({ code });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
