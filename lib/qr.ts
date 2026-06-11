const WINDOW_MS = 5 * 60 * 1000; // 5-minute windows

function getWindow(ts = Date.now()): number {
  return Math.floor(ts / WINDOW_MS);
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.QR_SECRET ?? 'dev-qr-secret-change-in-prod';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export async function currentToken(): Promise<string> {
  return hmac(getWindow().toString());
}

export async function verifyToken(token: string): Promise<boolean> {
  const w = getWindow();
  for (const candidate of [w, w - 1]) {
    if (token === await hmac(candidate.toString())) return true;
  }
  return false;
}

export function secondsUntilReset(): number {
  return Math.ceil((WINDOW_MS - (Date.now() % WINDOW_MS)) / 1000);
}
