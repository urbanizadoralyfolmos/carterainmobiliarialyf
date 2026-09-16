"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth/rol";

const ROLES_VALIDOS = ["admin", "gestor", "lectura"];

/**
 * Crea una cuenta de usuario nueva (correo + contraseña temporal) usando la
 * API de administración de Supabase, y le asigna el rol elegido. Reemplaza
 * tener que crear el usuario manualmente desde el panel de Supabase.
 *
 * Requiere que la variable de entorno SUPABASE_SERVICE_ROLE_KEY esté
 * configurada en Vercel (ver src/lib/supabase/admin.ts); si falta, se
 * muestra un mensaje explicando ese paso en vez de fallar en silencio.
 */
export async function crearUsuario(formData: FormData) {
  if (!(await esAdmin())) {
    redirect(`/usuarios?error=${encodeURIComponent("No tienes permisos para hacer esto.")}`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "gestor").trim();

  if (!email || !password) {
    redirect(
      `/usuarios?error=${encodeURIComponent("Completa el email y una contraseña temporal.")}`
    );
  }
  if (password.length < 6) {
    redirect(
      `/usuarios?error=${encodeURIComponent("La contraseña debe tener al menos 6 caracteres.")}`
    );
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    redirect(`/usuarios?error=${encodeURIComponent("Selecciona un rol válido.")}`);
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    redirect(
      `/usuarios?error=${encodeURIComponent(
        e instanceof Error ? e.message : "No se pudo crear el usuario."
      )}`
    );
  }

  const { data: creado, error: errorCrear } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre_completo: nombreCompleto || null },
  });

  if (errorCrear || !creado?.user) {
    redirect(
      `/usuarios?error=${encodeURIComponent(
        errorCrear?.message ?? "No se pudo crear el usuario."
      )}`
    );
  }

  // El trigger handle_new_user ya creó la fila en perfiles con rol "gestor"
  // por defecto. Si se eligió un rol distinto, se actualiza ahora con la
  // sesión de este mismo administrador (no con la clave de servicio), para
  // que pase por las mismas reglas normales de "solo un admin puede cambiar
  // un rol".
  if (rol !== "gestor") {
    const supabase = await createClient();
    await supabase.from("perfiles").update({ rol }).eq("id", creado.user!.id);
  }

  revalidatePath("/usuarios");
  redirect(`/usuarios?creado=${encodeURIComponent(email)}`);
}

/**
 * Cambia el rol de otro usuario. Requiere ser admin (chequeo aquí, para dar
 * un mensaje claro; la base de datos también lo exige mediante el trigger
 * `proteger_cambio_rol_perfiles`, así que aunque alguien se salte esta
 * pantalla, el cambio se rechaza igual). No se permite cambiar el propio
 * rol, para que un admin no pueda quitarse el acceso por error.
 */
export async function actualizarRolUsuario(formData: FormData) {
  const admin = await esAdmin();
  if (!admin) {
    redirect(`/usuarios?error=${encodeURIComponent("No tienes permisos para hacer esto.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuarioId = String(formData.get("usuario_id") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();

  if (!usuarioId || !ROLES_VALIDOS.includes(rol)) {
    redirect(`/usuarios?error=${encodeURIComponent("Selecciona un usuario y un rol válidos.")}`);
  }

  if (usuarioId === user?.id) {
    redirect(
      `/usuarios?error=${encodeURIComponent(
        "No puedes cambiar tu propio rol. Pídele a otro administrador que lo haga."
      )}`
    );
  }

  const { data: actualizado, error } = await supabase
    .from("perfiles")
    .update({ rol })
    .eq("id", usuarioId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(`/usuarios?error=${encodeURIComponent(error.message)}`);
  }

  // Si la base de datos no devolvió la fila actualizada, el cambio no se
  // aplicó (por ejemplo, bloqueado por una política/trigger) aunque
  // Supabase no haya marcado un error explícito. Se avisa en vez de dejar
  // la pantalla igual sin explicación.
  if (!actualizado) {
    redirect(
      `/usuarios?error=${encodeURIComponent(
        "No se pudo actualizar el rol. Vuelve a intentarlo o consulta a otro administrador."
      )}`
    );
  }

  revalidatePath("/usuarios");
  redirect(`/usuarios?guardado=1`);
}
