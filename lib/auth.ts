import { SignJWT, jwtVerify } from 'jose';

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? 'dev-admin-secret-change-in-prod');
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(secret());
}

export async function verifyAdminToken(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  try {
    await jwtVerify(auth.slice(7), secret());
    return true;
  } catch {
    return false;
  }
}
