'use client';
import { useEffect, useState } from 'react';

export type AppConfig = {
  businessName: string;
  rewardText: string;
  stampsRequired: number;
  maxGrantStamps: number;
};

const DEFAULTS: AppConfig = {
  businessName: 'Heladería El Paraíso',
  rewardText: '1 helado doble gratis 🍦',
  stampsRequired: 10,
  maxGrantStamps: 5,
};

let cached: AppConfig | null = null;

export function useConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(cached ?? DEFAULTS);

  useEffect(() => {
    if (cached) return;
    fetch('/api/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) { cached = data; setConfig(data); } })
      .catch(() => {});
  }, []);

  return config;
}
