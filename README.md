# 🍦 Helados PWA — Tarjeta de sellos digital

PWA de fidelización para heladerías: los clientes acumulan sellos escaneando un QR
y canjean un premio al completar la tarjeta.

## Cómo funciona

**Cliente:**
1. Abre `/card`, se registra con su nombre (se guarda en el dispositivo).
2. Escanea el QR del local → gana sellos.
3. Al completar la tarjeta aparece el botón **Reclamar premio** → genera un código
   de canje (válido 30 min) que muestra al cajero.

**Cajero / Admin (`/admin`):**
- **QR del local** (`/admin/qr`): QR rotativo (cambia cada 5 min, firmado con HMAC).
  Da **1 sello** y tiene límite de 1 sello cada 2 horas por cliente.
- **Dar sellos por compra** 🧾: si el cliente compra varios helados (o vuelve el
  mismo día), el cajero elige la cantidad (1–5) y genera un **QR de un solo uso**.
  Este QR se salta el límite de 2 horas porque lo autoriza el cajero, y expira en
  10 minutos.
- **Validar códigos** de premio y ver estadísticas / clientes top.

Si los sellos sobran al completar la tarjeta, se acarrean a la siguiente
(ej.: 8 sellos + compra de 5 = tarjeta completa + 3 sellos en la nueva).

## Desarrollo

```bash
npm install
npm run dev
```

En desarrollo no necesitas configurar nada: hay un store en memoria y la
contraseña de admin es `admin123`.

## Variables de entorno (producción)

| Variable | Requerida | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | **Sí** | Contraseña del panel admin. Sin ella el login se rechaza en producción. |
| `ADMIN_SECRET` | Sí | Secreto para firmar los JWT de admin. |
| `QR_SECRET` | Sí | Secreto HMAC del QR rotativo. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Sí | Vercel KV (sin ellas se usa memoria, que se pierde en cada deploy). |
| `BUSINESS_NAME` | No | Nombre del negocio (default: Heladería El Paraíso). |
| `REWARD_TEXT` | No | Texto del premio (default: 1 helado doble gratis 🍦). |
| `STAMPS_REQUIRED` | No | Sellos para completar la tarjeta (default: 10). |
| `MAX_GRANT_STAMPS` | No | Máximo de sellos por QR de compra (default: 5). |
| `NEXT_PUBLIC_APP_URL` | No | URL pública (se autodetecta si no se define). |

## Seguridad

- QR rotativo firmado con HMAC-SHA256, expira en 5 minutos.
- QR de compra: código aleatorio criptográfico, un solo uso, expira en 10 minutos.
- Códigos de canje generados con `crypto.getRandomValues` (alfabeto sin caracteres
  ambiguos como 0/O o 1/I).
- Login de admin con bloqueo por IP: 5 intentos fallidos → 15 minutos de espera.
