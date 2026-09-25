import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "gestor" | "lectura";

/**
 * Rol del usuario que hizo la petición actual, leído de `perfiles`. Devuelve
 * `null` si no hay sesión o si el usuario todavía no tiene fila en
 * `perfiles` (no debería pasar en uso normal, pero se trata como "sin
 * permisos" en vez de lanzar un error).
 */
export async function obtenerRolActual(): Promise<Rol | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  return (data?.rol as Rol | undefined) ?? null;
}

export async function esAdmin(): Promise<boolean> {
  return (await obtenerRolActual()) === "admin";
}

export async function esGestor(): Promise<boolean> {
  return (await obtenerRolActual()) === "gestor";
}

/**
 * true si el usuario puede editar el área de los lotes al generar/ajustar
 * manzanas (y por lo tanto disparar el recálculo automático del valor). Lo
 * puede hacer un administrador o un gestor.
 */
export async function esAdminOGestor(): Promise<boolean> {
  const rol = await obtenerRolActual();
  return rol === "admin" || rol === "gestor";
}

/**
 * Chequeo de conveniencia para usar al inicio de un Server Action que solo
 * un administrador puede ejecutar (editar/eliminar). Es una capa de UX sobre
 * el control real, que vive en las políticas de RLS/triggers de la base de
 * datos: si alguien igual llega a llamar la acción sin ser admin, la base de
 * datos rechaza el cambio de todos modos.
 */
export async function requireAdmin(
  redirectTo: string,
  mensaje = "No tienes permisos para realizar esta acción. Consulta a un administrador."
): Promise<void> {
  const admin = await esAdmin();
  if (!admin) {
    redirect(`${redirectTo}?error=${encodeURIComponent(mensaje)}`);
  }
}

/**
 * Igual que `requireAdmin`, pero también deja pasar al rol "gestor". Se usa
 * en acciones puntuales donde un gestor debe tener el mismo permiso que un
 * administrador (por ejemplo, editar el área de un lote y que el valor se
 * recalcule solo).
 */
export async function requireAdminOGestor(
  redirectTo: string,
  mensaje = "No tienes permisos para realizar esta acción. Consulta a un administrador."
): Promise<void> {
  const permitido = await esAdminOGestor();
  if (!permitido) {
    redirect(`${redirectTo}?error=${encodeURIComponent(mensaje)}`);
  }
}
