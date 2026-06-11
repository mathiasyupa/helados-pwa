'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';

function GrantQRContent() {
  const router = useRouter();
  const params = useSearchParams();
  const url = params.get('url') ?? '';
  const stamps = Number(params.get('stamps') ?? '1');
  const totalSeconds = Number(params.get('exp') ?? '600');
  const [seconds, setSeconds] = useState(totalSeconds);

  useEffect(() => {
    if (!url) { router.replace('/admin'); return; }
  }, [url, router]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); router.replace('/admin'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const pct = (seconds / totalSeconds) * 100;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-950 p-6 gap-6">
      <div className="text-center">
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
          QR de compra — un solo uso
        </p>
        <h1 className="text-white text-2xl font-bold mt-1">
          🧾 {stamps} {stamps === 1 ? 'sello' : 'sellos'} — pídele al cliente que escanee
        </h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-2xl">
        {url
          ? <QRCode value={url} size={224} level="M" />
          : <div className="w-56 h-56 flex items-center justify-center"><span className="text-5xl animate-spin">🍦</span></div>
        }
      </div>

      <div className="text-center">
        <p className="text-white/40 text-xs mb-2">Este QR es válido por</p>
        <p className={`text-3xl font-black tabular-nums ${seconds < 60 ? 'text-red-400' : 'text-white'}`}>
          {mm}:{ss}
        </p>
        <div className="w-56 bg-white/10 rounded-full h-1 mt-3 mx-auto">
          <div
            className="h-1 rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: seconds < 60 ? '#f87171' : 'linear-gradient(90deg, #f472b6, #a78bfa)',
            }}
          />
        </div>
        <p className="text-white/30 text-xs mt-3">
          El QR se destruye automáticamente al usarse o al expirar
        </p>
      </div>

      <button
        onClick={() => router.push('/admin')}
        className="text-white/40 text-sm hover:text-white/70 transition-colors"
      >
        ← Volver al panel
      </button>
    </div>
  );
}

export default function GrantQRPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-gray-950">
        <span className="text-5xl animate-bounce">🍦</span>
      </div>
    }>
      <GrantQRContent />
    </Suspense>
  );
}
