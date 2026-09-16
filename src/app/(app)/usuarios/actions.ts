"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/auth/rol";

const ROLES_VALIDOS = ["admin", "gestor", "lectura"];

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

  const { error } = await supabase.from("perfiles").update({ rol }).eq("id", usuarioId);
  if (error) {
    redirect(`/usuarios?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
