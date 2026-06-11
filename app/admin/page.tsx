'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useConfig } from '@/lib/useConfig';

type Stats = {
  totalCustomers: number;
  totalStamps: number;
  topCustomers: { name: string; stamps: number; totalCompleted: number }[];
};

type GrantInfo = { code: string; stamps: number; url: string; expiresInSeconds: number };

export default function AdminPage() {
  const router = useRouter();
  const config = useConfig();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [code, setCode] = useState('');
  const [validateMsg, setValidateMsg] = useState('');
  const [validateOk, setValidateOk] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  const [grantQty, setGrantQty] = useState(1);
  const [grant, setGrant] = useState<GrantInfo | null>(null);
  const [grantSeconds, setGrantSeconds] = useState(0);
  const [granting, setGranting] = useState(false);

  const getToken = () => sessionStorage.getItem('adminToken') ?? '';

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/stats', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem('adminToken');
    if (t) { setAuthed(true); }
  }, []);

  useEffect(() => {
    if (authed) loadStats();
  }, [authed, loadStats]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token } = await res.json();
      sessionStorage.setItem('adminToken', token);
      setAuthed(true);
    } else {
      const data = await res.json().catch(() => null);
      setLoginError(res.status === 429
        ? (data?.error ?? 'Demasiados intentos. Espera 15 minutos.')
        : 'Contraseña incorrecta');
    }
    setLoggingIn(false);
  }

  async function handleGrant() {
    setGranting(true);
    const res = await fetch('/api/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ stamps: grantQty }),
    });
    if (res.ok) {
      const data: GrantInfo = await res.json();
      setGrant(data);
      setGrantSeconds(data.expiresInSeconds);
    }
    setGranting(false);
  }

  // Grant QR countdown — hide the QR when it expires
  useEffect(() => {
    if (!grant) return;
    const t = setInterval(() => {
      setGrantSeconds(s => {
        if (s <= 1) { setGrant(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [grant]);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setValidating(true);
    setValidateMsg('');
    setValidateOk(null);
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (res.ok) {
      setValidateOk(true);
      setValidateMsg(`✅ Premio válido para ${data.customerName}. ¡Código marcado como usado!`);
      setCode('');
      loadStats();
    } else {
      setValidateOk(false);
      setValidateMsg(`❌ ${data.error}`);
    }
    setValidating(false);
  }

  /* ── Login screen ── */
  if (!authed) return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow bounce-in">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🍦</div>
          <h1 className="text-2xl font-bold text-gray-800">Panel Admin</h1>
          <p className="text-gray-400 text-sm mt-1">{config.businessName}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full border-2 border-pink-200 rounded-2xl px-4 py-3 text-gray-800
                       focus:outline-none focus:border-pink-400 text-center text-lg"
            autoFocus
          />
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button type="submit" disabled={loggingIn || !password}
            className="w-full gradient-btn text-white font-bold py-3 rounded-2xl
                       disabled:opacity-50 active:scale-95 transition-all">
            {loggingIn ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── Dashboard ── */
  return (
    <div className="min-h-dvh p-4 pt-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Panel Admin 🍦</h1>
            <p className="text-gray-400 text-sm">{config.businessName}</p>
          </div>
          <button onClick={() => router.push('/admin/qr')}
            className="gradient-btn text-white font-bold py-2 px-4 rounded-xl text-sm active:scale-95">
            📱 Ver QR
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 card-shadow text-center">
              <p className="text-3xl font-black text-pink-500">{stats.totalCustomers}</p>
              <p className="text-gray-500 text-xs mt-1">Clientes</p>
            </div>
            <div className="bg-white rounded-2xl p-4 card-shadow text-center">
              <p className="text-3xl font-black text-violet-500">{stats.totalStamps}</p>
              <p className="text-gray-500 text-xs mt-1">Sellos dados</p>
            </div>
          </div>
        )}

        {/* Grant stamps for a purchase */}
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <h2 className="font-bold text-gray-700 mb-1">Dar sellos por compra 🧾</h2>
          <p className="text-gray-400 text-xs mb-3">
            Genera un QR de un solo uso con los sellos de la compra. Funciona aunque el
            cliente ya haya ganado un sello hoy.
          </p>

          {!grant ? (
            <>
              <div className="flex gap-2 mb-3">
                {Array.from({ length: config.maxGrantStamps }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setGrantQty(n)}
                    className={`flex-1 py-2 rounded-xl font-bold text-lg transition-all active:scale-95 ${
                      grantQty === n
                        ? 'gradient-btn text-white'
                        : 'bg-pink-50 text-pink-400 border border-pink-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGrant}
                disabled={granting}
                className="w-full gradient-btn text-white font-bold py-3 rounded-xl
                           disabled:opacity-50 active:scale-95 transition-all"
              >
                {granting ? 'Generando...' : `Generar QR de ${grantQty} ${grantQty === 1 ? 'sello' : 'sellos'}`}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-block bg-white p-3 rounded-2xl border-2 border-pink-200 mb-3">
                <QRCode value={grant.url} size={180} level="M" />
              </div>
              <p className="text-gray-700 font-semibold">
                {grant.stamps} {grant.stamps === 1 ? 'sello' : 'sellos'} — un solo uso
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Expira en <strong className={grantSeconds < 60 ? 'text-red-500' : 'text-gray-600'}>
                  {String(Math.floor(grantSeconds / 60)).padStart(2, '0')}:{String(grantSeconds % 60).padStart(2, '0')}
                </strong>
              </p>
              <button
                onClick={() => setGrant(null)}
                className="mt-3 text-pink-400 text-sm font-medium"
              >
                ← Generar otro
              </button>
            </div>
          )}
        </div>

        {/* Validate code */}
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <h2 className="font-bold text-gray-700 mb-3">Validar código de premio</h2>
          <form onSubmit={handleValidate} className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: AB23CD"
              maxLength={6}
              className="flex-1 border-2 border-pink-200 rounded-xl px-3 py-2 text-center font-mono
                         font-bold text-gray-800 text-lg focus:outline-none focus:border-pink-400"
            />
            <button type="submit" disabled={validating || code.length < 4}
              className="gradient-btn text-white font-bold py-2 px-4 rounded-xl
                         disabled:opacity-50 active:scale-95 transition-all">
              {validating ? '...' : 'Validar'}
            </button>
          </form>
          {validateMsg && (
            <p className={`mt-3 text-sm font-medium rounded-xl p-3 ${
              validateOk
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {validateMsg}
            </p>
          )}
        </div>

        {/* Top customers */}
        {stats && stats.topCustomers.length > 0 && (
          <div className="bg-white rounded-2xl p-5 card-shadow">
            <h2 className="font-bold text-gray-700 mb-3">Clientes top 🏆</h2>
            <div className="space-y-2">
              {stats.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="font-medium text-gray-700">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-pink-500 font-bold">{c.stamps} sellos</span>
                    {c.totalCompleted > 0 && (
                      <span className="text-xs text-gray-400 ml-2">{c.totalCompleted} premios</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => { sessionStorage.removeItem('adminToken'); setAuthed(false); }}
          className="w-full text-gray-400 text-sm py-2">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
