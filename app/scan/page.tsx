'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConfig } from '@/lib/useConfig';

type State = 'loading' | 'need-name' | 'confirm' | 'scanning' | 'success' | 'error' | 'no-token';

function ScanContent() {
  const router = useRouter();
  const params = useSearchParams();
  const config = useConfig();
  const token = params.get('t') ?? '';
  const grant = params.get('g') ?? '';

  const [state, setState] = useState<State>('loading');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [stampsAdded, setStampsAdded] = useState(1);

  useEffect(() => {
    if (!token && !grant) { setState('no-token'); return; }
    const id = localStorage.getItem('customerId');
    if (id) {
      setCustomerId(id);
      setState('confirm');
    } else {
      setState('need-name');
    }
  }, [token, grant]);

  async function registerAndScan() {
    if (!name.trim()) return;
    const id = crypto.randomUUID();
    const res = await fetch('/api/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: name.trim() }),
    });
    if (!res.ok) { setState('error'); setMessage('Error al registrarte. Inténtalo de nuevo.'); return; }
    const data = await res.json();
    localStorage.setItem('customerId', data.id);
    localStorage.setItem('customerName', data.name);
    setCustomerId(data.id);
    await doScan(data.id);
  }

  async function doScan(id?: string) {
    setState('scanning');
    const cid = id ?? customerId;
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grant ? { grant, customerId: cid } : { token, customerId: cid }),
    });
    const data = await res.json();
    if (!res.ok) {
      setState('error');
      setMessage(data.error ?? 'No se pudo añadir el sello.');
      return;
    }
    setStampsAdded(data.stampsAdded ?? 1);
    setState('success');
    setTimeout(() => {
      if (data.justCompleted && data.code) {
        router.replace(`/premio?code=${data.code}`);
      } else {
        router.replace('/card?new=1');
      }
    }, 1500);
  }

  /* ── States ── */
  if (state === 'loading') return (
    <div className="min-h-dvh flex items-center justify-center">
      <span className="text-5xl animate-bounce">🍦</span>
    </div>
  );

  if (state === 'no-token') return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">QR inválido</h2>
        <p className="text-gray-500 text-sm mb-6">
          Por favor escanea el código QR del local, no abras este enlace directamente.
        </p>
        <button onClick={() => router.push('/card')}
          className="gradient-btn text-white font-bold py-3 px-6 rounded-2xl w-full">
          Ver mi tarjeta
        </button>
      </div>
    </div>
  );

  if (state === 'need-name') return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow bounce-in">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🍦</div>
          <h1 className="text-2xl font-bold text-gray-800">¡Primera visita!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Dinos tu nombre para empezar a acumular sellos
          </p>
        </div>
        <div className="space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && registerAndScan()}
            placeholder="¿Cómo te llamas?"
            className="w-full border-2 border-pink-200 rounded-2xl px-4 py-3
                       focus:outline-none focus:border-pink-400 text-center text-lg text-gray-800"
            maxLength={40}
            autoFocus
          />
          <button
            onClick={registerAndScan}
            disabled={!name.trim()}
            className="w-full gradient-btn text-white font-bold py-3 rounded-2xl
                       disabled:opacity-50 active:scale-95 transition-all"
          >
            ¡Ganar mi primer sello! 🎉
          </button>
        </div>
      </div>
    </div>
  );

  if (state === 'confirm') return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow bounce-in text-center">
        <div className="text-6xl mb-4">🍦</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.businessName}</h2>
        <p className="text-gray-500 mb-8">
          {grant
            ? '¿Confirmas tu compra para recibir tus sellos?'
            : '¿Confirmas tu visita para ganar un sello?'}
        </p>
        <button
          onClick={() => doScan()}
          className="w-full gradient-btn text-white font-bold py-4 rounded-2xl text-lg
                     active:scale-95 transition-all"
        >
          {grant ? '✅ Recibir mis sellos' : '✅ Confirmar y ganar sello'}
        </button>
        <button
          onClick={() => router.push('/card')}
          className="w-full mt-3 text-gray-400 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  if (state === 'scanning') return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <span className="text-6xl animate-bounce">🍦</span>
      <p className="text-gray-600 font-medium">Añadiendo {grant ? 'sellos' : 'sello'}...</p>
    </div>
  );

  if (state === 'success') return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <div className="text-8xl bounce-in">🎉</div>
      <p className="text-2xl font-bold text-gray-700">
        {stampsAdded > 1 ? `¡${stampsAdded} sellos añadidos!` : '¡Sello añadido!'}
      </p>
      <p className="text-gray-400 text-sm">Redirigiendo a tu tarjeta...</p>
    </div>
  );

  // error
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">No se pudo añadir</h2>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <button onClick={() => router.push('/card')}
          className="gradient-btn text-white font-bold py-3 px-6 rounded-2xl w-full">
          Ver mi tarjeta
        </button>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <span className="text-5xl animate-bounce">🍦</span>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
