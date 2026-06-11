import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getAllCustomers } from '@/lib/store';
import { STAMPS_REQUIRED } from '@/lib/config';

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const customers = await getAllCustomers();
    const totalStamps = customers.reduce((s, c) => s + c.stamps + c.totalCompleted * STAMPS_REQUIRED, 0);
    const topCustomers = [...customers]
      .sort((a, b) => (b.totalCompleted * STAMPS_REQUIRED + b.stamps) - (a.totalCompleted * STAMPS_REQUIRED + a.stamps))
      .slice(0, 5)
      .map(c => ({ name: c.name, stamps: c.stamps, totalCompleted: c.totalCompleted }));
    return NextResponse.json({ totalCustomers: customers.length, totalStamps, topCustomers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
