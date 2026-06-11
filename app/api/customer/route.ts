import { NextRequest, NextResponse } from 'next/server';
import { upsertCustomer } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const customer = await upsertCustomer(id, name);
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
