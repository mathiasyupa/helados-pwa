import { NextResponse } from 'next/server';
import { BUSINESS_NAME, REWARD_TEXT, STAMPS_REQUIRED, MAX_GRANT_STAMPS } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    businessName: BUSINESS_NAME,
    rewardText: REWARD_TEXT,
    stampsRequired: STAMPS_REQUIRED,
    maxGrantStamps: MAX_GRANT_STAMPS,
  });
}
