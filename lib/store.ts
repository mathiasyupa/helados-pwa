import { kv } from '@vercel/kv';
import { STAMPS_REQUIRED } from './config';

export type Customer = {
  id: string;
  name: string;
  stamps: number;
  totalCompleted: number;
  createdAt: string;
};

export type Redemption = {
  customerId: string;
  customerName: string;
  createdAt: string;
};

const cKey  = (id: string)   => `customer:${id}`;
const rlKey = (id: string)   => `rl:${id}`;
const rdKey = (code: string) => `redeem:${code}`;

export async function getCustomer(id: string): Promise<Customer | null> {
  return kv.get<Customer>(cKey(id));
}

export async function upsertCustomer(id: string, name: string): Promise<Customer> {
  const existing = await getCustomer(id);
  if (existing) return existing;
  const c: Customer = { id, name, stamps: 0, totalCompleted: 0, createdAt: new Date().toISOString() };
  await kv.set(cKey(id), c);
  await kv.sadd('all_customers', id);
  return c;
}

export async function addStamp(id: string): Promise<{ customer: Customer; justCompleted: boolean }> {
  const c = await getCustomer(id);
  if (!c) throw new Error('Customer not found');
  c.stamps += 1;
  let justCompleted = false;
  if (c.stamps >= STAMPS_REQUIRED) {
    c.stamps = 0;
    c.totalCompleted += 1;
    justCompleted = true;
  }
  await kv.set(cKey(id), c);
  await kv.set(rlKey(id), '1', { ex: 7200 }); // 2-hour rate limit
  return { customer: c, justCompleted };
}

export async function isRateLimited(id: string): Promise<boolean> {
  return (await kv.get(rlKey(id))) !== null;
}

export async function createRedemption(code: string, customerId: string, customerName: string): Promise<void> {
  await kv.set(rdKey(code), { customerId, customerName, createdAt: new Date().toISOString() } as Redemption, { ex: 1800 });
}

export async function getRedemption(code: string): Promise<Redemption | null> {
  return kv.get<Redemption>(rdKey(code));
}

export async function deleteRedemption(code: string): Promise<void> {
  await kv.del(rdKey(code));
}

export async function getAllCustomers(): Promise<Customer[]> {
  const ids = await kv.smembers<string[]>('all_customers');
  if (!ids?.length) return [];
  const results = await Promise.all(ids.map(id => getCustomer(id)));
  return results.filter((c): c is Customer => c !== null);
}
