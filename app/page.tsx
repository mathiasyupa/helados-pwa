'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/card'); }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <span className="text-6xl animate-bounce">🍦</span>
    </div>
  );
}
