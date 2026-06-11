'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useConfig } from '@/lib/useConfig';

export default function QRKioskPage() {
  const router = useRouter();
  const config = useConfig();
  const [qrUrl, setQrUrl] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [loading, setLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr-token', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') ?? ''}` },
      });
      if (!res.ok) { router.push('/admin'); return; }
      const { token, secondsLeft, appUrl } = await res.json();
      setQrUrl(`${appUrl}/scan?t=${token}`);
      setSeconds(secondsLeft);
    } catch {
      // silently retry
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Initial fetch
  useEffect(() => { fetchToken(); }, [fetchToken]);

  // Countdown + auto-refresh
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { fetchToken(); return 300; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [fetchToken]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const pct = (seconds / 300) * 100;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-950 p-6 gap-6">
      {/* Title */}
      <div className="text-center">
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
          {config.businessName}
        </p>
        <h1 className="text-white text-2xl font-bold mt-1">🍦 Escanea y gana sellos</h1>
      </div>

      {/* QR */}
      <div className="bg-white rounded-3xl p-6 shadow-2xl">
        {loading ? (
          <div className="w-56 h-56 flex items-center justify-center">
            <span className="text-5xl animate-spin">🍦</span>
          </div>
        ) : (
          <QRCode value={qrUrl} size={224} level="M" />
        )}
      </div>

      {/* Countdown */}
      <div className="text-center">
        <p className="text-white/40 text-xs mb-2">Este QR es válido por</p>
        <p className={`text-3xl font-black tabular-nums ${seconds < 30 ? 'text-red-400' : 'text-white'}`}>
          {mm}:{ss}
        </p>
        {/* Progress bar */}
        <div className="w-56 bg-white/10 rounded-full h-1 mt-3 mx-auto">
          <div
            className="h-1 rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: seconds < 30 ? '#f87171' : 'linear-gradient(90deg, #f472b6, #a78bfa)',
            }}
          />
        </div>
        <p className="text-white/30 text-xs mt-3">
          El QR rota automáticamente para evitar fraudes
        </p>
      </div>

      {/* Back button */}
      <button
        onClick={() => router.push('/admin')}
        className="text-white/40 text-sm hover:text-white/70 transition-colors"
      >
        ← Volver al panel
      </button>
    </div>
  );
}
