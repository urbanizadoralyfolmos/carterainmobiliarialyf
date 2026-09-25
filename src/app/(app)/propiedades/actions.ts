"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminOGestor } from "@/lib/auth/rol";

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

/**
 * Actualiza solo la superficie (m²) de una propiedad desde una lista (la de
 * Lotes dentro de un Proyecto, justo después de generarlos), sin necesidad
 * de entrar a la página de edición completa del lote. Como los lotes de una
 * misma manzana suelen tener áreas distintas, esto permite escribirlas una
 * por una en el listado.
 *
 * Si el lote tiene un valor por m² asignado (el que se definió al crear la
 * manzana), el valor de referencia se recalcula solo (área × valor por m²).
 * Si no tiene valor por m² asignado, el valor de referencia no se toca.
 *
 * `redirect_to` permite volver a la página/filtro desde donde se llamó si
 * algo sale mal (por defecto, la lista de Propiedades).
 *
 * Puede usarla un administrador o un gestor: ambos necesitan ir ajustando el
 * área de cada lote de una manzana recién creada (suelen variar entre sí), y
 * en los dos casos el valor de referencia se recalcula solo.
 */
export async function actualizarSuperficiePropiedad(id: string, formData: FormData) {
  const redirectTo = String(formData.get("redirect_to") ?? "").trim() || "/propiedades";
  await requireAdminOGestor(redirectTo);
  const supabase = await createClient();
  const raw = formData.get("superficie_m2");
  const texto = String(raw ?? "").trim();
  const superficie_m2 = texto === "" ? null : Number(texto);

  if (superficie_m2 !== null && (Number.isNaN(superficie_m2) || superficie_m2 < 0)) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("La superficie debe ser un número válido.")}`
    );
  }

  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("valor_m2")
    .eq("id", id)
    .single();

  const update: { superficie_m2: number | null; valor_referencia?: number } = {
    superficie_m2,
  };
  if (propiedad?.valor_m2 && superficie_m2 !== null) {
    update.valor_referencia = Math.round(superficie_m2 * propiedad.valor_m2 * 100) / 100;
  }

  const { error } = await supabase.from("propiedades").update(update).eq("id", id);

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  revalidatePath("/proyectos", "layout");
}

