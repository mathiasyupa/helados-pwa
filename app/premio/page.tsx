'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PremioContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get('code') ?? '';
  const [seconds, setSeconds] = useState(600); // 10 min

  useEffect(() => {
    if (!code) router.replace('/card');
  }, [code, router]);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(t); router.replace('/card'); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [router]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow bounce-in text-center">
        <div className="text-7xl mb-4">🎁</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">¡Premio desbloqueado!</h1>
        <p className="text-gray-500 text-sm mb-8">Muestra esta pantalla al cajero</p>

        {/* Code */}
        <div className="stamp-filled rounded-2xl px-6 py-5 mb-6">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
            Código de canje
          </p>
          <p className="text-white font-black text-5xl tracking-widest">{code}</p>
        </div>

        {/* Prize description */}
        <div className="bg-pink-50 rounded-2xl p-4 mb-6 border border-pink-100">
          <p className="text-gray-700 font-semibold">1 helado doble gratis 🍦</p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <span>⏱</span>
          <span>Expira en <strong className={seconds < 60 ? 'text-red-500' : 'text-gray-600'}>{mm}:{ss}</strong></span>
        </div>

        <button onClick={() => router.push('/card')}
          className="mt-6 text-gray-400 text-sm underline">
          Volver a mi tarjeta
        </button>
      </div>
    </div>
  );
}

export default function PremioPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center"><span className="text-5xl animate-bounce">🍦</span></div>}>
      <PremioContent />
    </Suspense>
  );
}
