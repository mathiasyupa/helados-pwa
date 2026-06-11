'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useConfig } from '@/lib/useConfig';

type CardData = {
  id: string;
  name: string;
  stamps: number;
  totalCompleted: number;
  unclaimedRewards: number;
};

function StampCircle({ filled, index, animate }: { filled: boolean; index: number; animate: boolean }) {
  return (
    <div
      className={`
        w-14 h-14 rounded-full flex items-center justify-center text-2xl
        transition-all duration-300
        ${filled
          ? `stamp-filled text-white ${animate ? 'stamp-pop' : ''}`
          : 'bg-white/60 border-2 border-pink-200'}
      `}
      style={animate && filled ? { animationDelay: `${index * 40}ms` } : {}}
    >
      {filled ? '🍦' : ''}
    </div>
  );
}

function CardContent() {
  const router = useRouter();
  const config = useConfig();
  const TOTAL = config.stampsRequired;
  const params = useSearchParams();
  const justEarned = params.get('new') === '1';
  const justCompleted = params.get('completed') === '1';

  const [card, setCard] = useState<CardData | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [animateStamps, setAnimateStamps] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const loadCard = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/card?id=${id}`);
      if (!res.ok) throw new Error();
      setCard(await res.json());
    } catch {
      localStorage.removeItem('customerId');
      localStorage.removeItem('customerName');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('customerId');
    if (!id) { setLoading(false); return; }
    loadCard(id);
  }, [loadCard]);

  useEffect(() => {
    if (justEarned) {
      setTimeout(() => setAnimateStamps(true), 300);
    }
  }, [justEarned]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const id = crypto.randomUUID();
    const res = await fetch('/api/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: name.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('customerId', data.id);
      localStorage.setItem('customerName', data.name);
      setCard(data);
    }
    setSaving(false);
  }

  async function handleRedeem() {
    setRedeeming(true);
    const id = localStorage.getItem('customerId')!;
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id }),
    });
    if (res.ok) {
      const { code } = await res.json();
      router.push(`/premio?code=${code}`);
    }
    setRedeeming(false);
  }

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <span className="text-5xl animate-bounce">🍦</span>
    </div>
  );

  /* ── NEW USER ── */
  if (!card) return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow bounce-in">
        <div className="text-center mb-6">
          <div className="text-7xl mb-3">🍦</div>
          <h1 className="text-2xl font-bold text-gray-800">¡Bienvenido!</h1>
          <p className="text-gray-500 mt-2 text-sm">Regístrate para empezar a acumular sellos</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="¿Cómo te llamas?"
            className="w-full border-2 border-pink-200 rounded-2xl px-4 py-3 text-gray-800
                       focus:outline-none focus:border-pink-400 text-center text-lg"
            required
            maxLength={40}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full gradient-btn text-white font-bold py-3 rounded-2xl
                       disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? 'Creando...' : 'Empezar a coleccionar 🎉'}
          </button>
        </form>
      </div>
    </div>
  );

  const filled = card.stamps;
  const remaining = TOTAL - filled;

  /* ── STAMP CARD ── */
  return (
    <div className="min-h-dvh flex flex-col items-center justify-start p-4 pt-8">
      {/* Notifications */}
      {justEarned && !justCompleted && (
        <div className="w-full max-w-sm mb-4 bg-green-100 border border-green-300 rounded-2xl
                        px-4 py-3 text-green-700 font-medium text-center bounce-in">
          ✅ ¡Sello añadido! Te {remaining > 1 ? `faltan ${remaining}` : 'falta 1'} más.
        </div>
      )}
      {justCompleted && (
        <div className="w-full max-w-sm mb-4 bg-yellow-50 border border-yellow-300 rounded-2xl
                        px-4 py-3 text-yellow-700 font-bold text-center bounce-in">
          🎉 ¡Tarjeta completa! Reclama tu premio abajo.
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden card-shadow bounce-in">
        {/* Header */}
        <div className="stamp-filled px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🍦</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">{config.businessName}</h1>
              <p className="text-pink-100 text-sm">Hola, {card.name} 👋</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-center text-gray-500 text-sm mb-4 font-medium">
            {(card.unclaimedRewards ?? 0) > 0
              ? '🎉 ¡Tienes un premio pendiente! Reclámalo abajo'
              : filled === 0
              ? '¡Escanea el QR para ganar tu primer sello!'
              : `${filled} de ${TOTAL} sellos — te ${remaining > 1 ? `faltan ${remaining}` : 'falta 1'}`}
          </p>

          {/* Stamps grid */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <StampCircle
                key={i}
                filled={i < filled}
                index={i}
                animate={animateStamps && i === filled - 1}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-pink-100 rounded-full h-2 mb-6">
            <div
              className="stamp-filled h-2 rounded-full transition-all duration-700"
              style={{ width: `${(filled / TOTAL) * 100}%` }}
            />
          </div>

          {/* Prize info */}
          <div className="bg-pink-50 rounded-2xl p-4 mb-4 border border-pink-100">
            <p className="text-xs text-pink-400 font-semibold uppercase tracking-wider mb-1">Tu premio</p>
            <p className="text-gray-700 font-semibold">{config.rewardText}</p>
          </div>

          {/* Redeem button — shown when there are unclaimed prizes */}
          {(card.unclaimedRewards ?? 0) > 0 && (
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              className="w-full gradient-btn text-white font-bold py-4 rounded-2xl text-lg
                         disabled:opacity-50 active:scale-95 transition-all"
            >
              {redeeming ? 'Generando...' : `🎁 Reclamar premio${(card.unclaimedRewards ?? 0) > 1 ? ` (${card.unclaimedRewards})` : ''}`}
            </button>
          )}

          {/* Total completed */}
          {card.totalCompleted > 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              Premios canjeados: {card.totalCompleted} 🏆
            </p>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-gray-400 text-xs mt-6 px-8">
        Escanea el código QR del local para ganar sellos
      </p>
    </div>
  );
}

export default function CardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <span className="text-5xl animate-bounce">🍦</span>
      </div>
    }>
      <CardContent />
    </Suspense>
  );
}
