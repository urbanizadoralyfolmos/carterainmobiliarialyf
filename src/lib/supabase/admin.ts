import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave `service_role` (permisos de administrador,
 * ignora RLS). Solo debe usarse en Server Actions ya protegidas por
 * `requireAdmin`/`esAdmin`, y únicamente para operaciones que la API normal
 * no permite hacer desde el navegador, como crear un usuario nuevo
 * (`auth.admin.createUser`).
 *
 * Requiere la variable de entorno `SUPABASE_SERVICE_ROLE_KEY` (la clave
 * secreta "service_role" del proyecto, distinta de la clave pública/anon que
 * ya usa el resto de la app). Se consigue en el panel de Supabase:
 * Project Settings → API → Project API keys → "service_role" (secret), y se
 * agrega como variable de entorno en Vercel. NUNCA debe exponerse al
 * navegador (por eso no lleva el prefijo NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta configurar la variable de entorno SUPABASE_SERVICE_ROLE_KEY en Vercel. Sin ella no se pueden crear usuarios nuevos desde la aplicación."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
