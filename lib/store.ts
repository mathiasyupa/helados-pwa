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

export type Grant = {
  stamps: number;
  createdAt: string;
};

// ── In-memory fallback (dev / when KV not configured) ──────────────────────
const memCustomers = new Map<string, Customer>();
const memRateLimit = new Map<string, number>(); // id → expiry timestamp
const memRedeem    = new Map<string, { data: Redemption; expiry: number }>();
const memGrants    = new Map<string, { data: Grant; expiry: number }>();
const memLoginFails = new Map<string, { count: number; expiry: number }>();
const memSet       = new Set<string>();

async function kvOp<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  if (!hasKV) return fallback();
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

// ── KV helpers (imported lazily) ────────────────────────────────────────────
async function getKV() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function getCustomer(id: string): Promise<Customer | null> {
  return kvOp(
    async () => { const kv = await getKV(); return kv.get<Customer>(`customer:${id}`); },
    ()       => memCustomers.get(id) ?? null,
  );
}

export async function upsertCustomer(id: string, name: string): Promise<Customer> {
  const existing = await getCustomer(id);
  if (existing) return existing;
  const c: Customer = { id, name, stamps: 0, totalCompleted: 0, createdAt: new Date().toISOString() };

  await kvOp(
    async () => {
      const kv = await getKV();
      await kv.set(`customer:${id}`, c);
      await kv.sadd('all_customers', id);
    },
    () => { memCustomers.set(id, c); memSet.add(id); },
  );
  return c;
}

export async function addStamps(
  id: string,
  count: number,
  { rateLimit = true }: { rateLimit?: boolean } = {},
): Promise<{ customer: Customer; justCompleted: boolean }> {
  const c = await getCustomer(id);
  if (!c) throw new Error('Customer not found');

  c.stamps += count;
  let justCompleted = false;
  // Carry over: e.g. 8 stamps + 3 bought = card completed + 1 stamp on the new card
  while (c.stamps >= STAMPS_REQUIRED) {
    c.stamps -= STAMPS_REQUIRED;
    c.totalCompleted += 1;
    justCompleted = true;
  }

  const expiry = Date.now() + 7200_000; // 2 hours
  await kvOp(
    async () => {
      const kv = await getKV();
      await kv.set(`customer:${id}`, c);
      if (rateLimit) await kv.set(`rl:${id}`, '1', { ex: 7200 });
    },
    () => {
      memCustomers.set(id, c);
      if (rateLimit) memRateLimit.set(id, expiry);
    },
  );
  return { customer: c, justCompleted };
}

export async function isRateLimited(id: string): Promise<boolean> {
  return kvOp(
    async () => { const kv = await getKV(); return (await kv.get(`rl:${id}`)) !== null; },
    () => {
      const exp = memRateLimit.get(id);
      if (!exp) return false;
      if (Date.now() > exp) { memRateLimit.delete(id); return false; }
      return true;
    },
  );
}

export async function createRedemption(code: string, customerId: string, customerName: string): Promise<void> {
  const data: Redemption = { customerId, customerName, createdAt: new Date().toISOString() };
  const expiry = Date.now() + 1_800_000; // 30 min

  await kvOp(
    async () => { const kv = await getKV(); await kv.set(`redeem:${code}`, data, { ex: 1800 }); },
    () => { memRedeem.set(code, { data, expiry }); },
  );
}

export async function getRedemption(code: string): Promise<Redemption | null> {
  return kvOp(
    async () => { const kv = await getKV(); return kv.get<Redemption>(`redeem:${code}`); },
    () => {
      const entry = memRedeem.get(code);
      if (!entry) return null;
      if (Date.now() > entry.expiry) { memRedeem.delete(code); return null; }
      return entry.data;
    },
  );
}

export async function deleteRedemption(code: string): Promise<void> {
  await kvOp(
    async () => { const kv = await getKV(); await kv.del(`redeem:${code}`); },
    () => { memRedeem.delete(code); },
  );
}

// ── Stamp grants (single-use QR issued by the cashier, 1-N stamps) ──────────
const GRANT_TTL_S = 600; // 10 min to scan it

export async function createGrant(code: string, stamps: number): Promise<void> {
  const data: Grant = { stamps, createdAt: new Date().toISOString() };
  await kvOp(
    async () => { const kv = await getKV(); await kv.set(`grant:${code}`, data, { ex: GRANT_TTL_S }); },
    () => { memGrants.set(code, { data, expiry: Date.now() + GRANT_TTL_S * 1000 }); },
  );
}

/** Returns the grant and deletes it (single use), or null if missing/expired. */
export async function consumeGrant(code: string): Promise<Grant | null> {
  return kvOp(
    async () => {
      const kv = await getKV();
      const data = await kv.get<Grant>(`grant:${code}`);
      if (data) await kv.del(`grant:${code}`);
      return data;
    },
    () => {
      const entry = memGrants.get(code);
      if (!entry) return null;
      memGrants.delete(code);
      if (Date.now() > entry.expiry) return null;
      return entry.data;
    },
  );
}

// ── Admin login throttling (per IP) ─────────────────────────────────────────
const LOGIN_MAX_FAILS = 5;
const LOGIN_BLOCK_S = 900; // 15 min

export async function isLoginBlocked(ip: string): Promise<boolean> {
  return kvOp(
    async () => {
      const kv = await getKV();
      const fails = await kv.get<number>(`loginfail:${ip}`);
      return (fails ?? 0) >= LOGIN_MAX_FAILS;
    },
    () => {
      const entry = memLoginFails.get(ip);
      if (!entry || Date.now() > entry.expiry) return false;
      return entry.count >= LOGIN_MAX_FAILS;
    },
  );
}

export async function recordLoginFail(ip: string): Promise<void> {
  await kvOp(
    async () => {
      const kv = await getKV();
      const fails = await kv.incr(`loginfail:${ip}`);
      if (fails === 1) await kv.expire(`loginfail:${ip}`, LOGIN_BLOCK_S);
    },
    () => {
      const entry = memLoginFails.get(ip);
      if (!entry || Date.now() > entry.expiry) {
        memLoginFails.set(ip, { count: 1, expiry: Date.now() + LOGIN_BLOCK_S * 1000 });
      } else {
        entry.count += 1;
      }
    },
  );
}

export async function clearLoginFails(ip: string): Promise<void> {
  await kvOp(
    async () => { const kv = await getKV(); await kv.del(`loginfail:${ip}`); },
    () => { memLoginFails.delete(ip); },
  );
}

export async function getAllCustomers(): Promise<Customer[]> {
  return kvOp(
    async () => {
      const kv = await getKV();
      const ids = await kv.smembers<string[]>('all_customers');
      if (!ids?.length) return [];
      const results = await Promise.all(ids.map(id => kv.get<Customer>(`customer:${id}`)));
      return results.filter((c): c is Customer => c !== null);
    },
    () => Array.from(memCustomers.values()),
  );
}
