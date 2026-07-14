# Cartera Inmobiliaria

App de control de cartera inmobiliaria: clientes, propiedades, contratos, cuotas y mora.
Next.js 16 (App Router) + Supabase (Postgres + Auth) + Tailwind CSS.

## Funcionalidad

- Login por usuario (Supabase Auth). Todas las rutas están protegidas por middleware.
- CRUD de clientes, propiedades y contratos.
- Al crear un contrato se genera automáticamente el plan de cuotas mensuales.
- Registro de pagos por cuota (total o parcial).
- Cálculo automático de días de mora y recargo según la tasa mensual del contrato.
- Dashboard con cartera mensual, cuotas en mora, monto vencido y próximos vencimientos.

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (o usá uno existente).
2. Andá a **SQL Editor** y ejecutá el contenido de `supabase/schema.sql` (crea las tablas,
   la vista de mora, los triggers y las políticas de RLS).
3. Andá a **Project Settings > API** y copiá:
   - `Project URL`
   - `anon public key`
4. Creá al menos un usuario en **Authentication > Users > Add user** (email + password)
   para poder loguearte en la app. También podés habilitar el alta pública desde
   **Authentication > Providers** si querés que los usuarios se registren solos.

## 2. Configurar variables de entorno

Copiá `.env.local.example` a `.env.local` y completá con los datos del paso anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 3. Correr localmente

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 — te va a redirigir a `/login`.

## 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Cartera inmobiliaria - versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/cartera-inmobiliaria.git
git push -u origin main
```

## 5. Desplegar en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá el repositorio de GitHub.
2. En **Environment Variables** agregá las mismas dos variables del paso 2
   (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy. Cada push a `main` vuelve a desplegar automáticamente.

## Estructura

```
supabase/schema.sql       - esquema completo de la base de datos
src/lib/supabase/         - clientes de Supabase (browser, server, middleware)
src/lib/utils/mora.ts     - cálculo de mora y generación del plan de cuotas
src/middleware.ts         - protección de rutas (redirige a /login si no hay sesión)
src/app/login             - pantalla de login
src/app/(app)/dashboard   - panel de métricas
src/app/(app)/clientes    - CRUD de clientes
src/app/(app)/propiedades - CRUD de propiedades
src/app/(app)/contratos   - CRUD de contratos (genera cuotas al crear)
src/app/(app)/cuotas      - listado de cuotas, pagos y mora
```

## Notas de diseño

- Regla de mora: `recargo = saldo_pendiente x (tasa_mora_mensual / 100 / 30) x días_de_atraso`,
  calculada al vuelo (no se guarda en la base). La tasa se define por contrato.
- RLS: cualquier usuario autenticado puede leer/escribir todas las entidades (pensado
  para un equipo interno). Si necesitas aislar datos por usuario o agregar roles con
  distintos permisos, se ajusta en las políticas de `supabase/schema.sql`.
