"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

// El estado de una propiedad ya no se lee ni se escribe desde este
// formulario: se calcula automáticamente a partir del contrato vinculado
// (ver la función `recalcular_estado_propiedad` y sus triggers en la base
// de datos). Incluirlo aquí en un UPDATE haría fallar el guardado, porque
// la base de datos rechaza cualquier cambio manual a esa columna.
function readPropiedadForm(formData: FormData) {
  return {
    direccion: String(formData.get("direccion") ?? "").trim(),
    ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    tipo: String(formData.get("tipo") ?? "departamento"),
    superficie_m2: formData.get("superficie_m2")
      ? Number(formData.get("superficie_m2"))
      : null,
    valor_m2: formData.get("valor_m2") ? Number(formData.get("valor_m2")) : null,
    valor_referencia: formData.get("valor_referencia")
      ? Number(formData.get("valor_referencia"))
      : null,
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim() || null,
    numero_lote: String(formData.get("numero_lote") ?? "").trim() || null,
    manzana: String(formData.get("manzana") ?? "").trim() || null,
    numero_escritura: String(formData.get("numero_escritura") ?? "").trim() || null,
    fecha_escritura: String(formData.get("fecha_escritura") ?? "").trim() || null,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
  };
}

export async function crearPropiedad(formData: FormData) {
  const supabase = await createClient();
  const data = readPropiedadForm(formData);

  const { error } = await supabase.from("propiedades").insert(data);
  if (error) {
    redirect(`/propiedades/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  redirect("/propiedades");
}

export async function actualizarPropiedad(id: string, formData: FormData) {
  await requireAdmin(`/propiedades/${id}`);
  const supabase = await createClient();
  const data = readPropiedadForm(formData);

  const { error } = await supabase.from("propiedades").update(data).eq("id", id);
  if (error) {
    redirect(`/propiedades/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  redirect("/propiedades");
}

/**
 * `redirect_to` permite volver al mismo listado/filtro de Propiedades desde
 * donde se eliminó (por ejemplo "Sin proyecto" o un proyecto puntual), en
 * vez de siempre volver al listado completo. Así se pueden eliminar varias
 * propiedades seguidas sin perder el filtro cada vez.
 */
export async function eliminarPropiedad(id: string, formData: FormData) {
  const redirectTo = String(formData.get("redirect_to") ?? "").trim() || "/propiedades";
  await requireAdmin(redirectTo);
  const supabase = await createClient();

  const { error } = await supabase.from("propiedades").delete().eq("id", id);
  if (error) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "No se pudo eliminar: esta propiedad tiene un contrato asociado. Elimina o reasigna ese contrato primero."
      )}`
    );
  }

  revalidatePath("/propiedades");
  redirect(redirectTo);
}

/**
 * Elimina de una sola vez todas las propiedades marcadas con checkbox en el
 * listado (`propiedad_ids`, uno por casilla). Es una sola sentencia DELETE:
 * si alguna de las seleccionadas ya tiene un contrato asociado, la base de
 * datos bloquea el borrado de TODAS (no se permite borrar una propiedad con
 * contratos vigentes), así que no queda a medias — se avisa para que se
 * deselecciones esa propiedad puntual e intentes de nuevo con el resto.
 */
export async function eliminarPropiedades(formData: FormData) {
  const redirectTo = String(formData.get("redirect_to") ?? "").trim() || "/propiedades";
  await requireAdmin(redirectTo);
  const supabase = await createClient();
  const ids = formData.getAll("propiedad_ids").map(String).filter(Boolean);

  if (ids.length === 0) {
    redirect(`${redirectTo}?error=${encodeURIComponent("No seleccionaste ninguna propiedad.")}`);
  }

  const { error } = await supabase.from("propiedades").delete().in("id", ids);
  if (error) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "No se pudo eliminar: alguna de las propiedades seleccionadas tiene un contrato asociado. Deselecciónala e intenta de nuevo con el resto."
      )}`
    );
  }

  revalidatePath("/propiedades");
  redirect(redirectTo);
}

