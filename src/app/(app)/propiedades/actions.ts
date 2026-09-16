"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

function readPropiedadForm(formData: FormData) {
  const estado = String(formData.get("estado") ?? "disponible");

  return {
    direccion: String(formData.get("direccion") ?? "").trim(),
    ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    tipo: String(formData.get("tipo") ?? "departamento"),
    superficie_m2: formData.get("superficie_m2")
      ? Number(formData.get("superficie_m2"))
      : null,
    valor_referencia: formData.get("valor_referencia")
      ? Number(formData.get("valor_referencia"))
      : null,
    estado,
    proyecto_id: String(formData.get("proyecto_id") ?? "").trim() || null,
    numero_lote: String(formData.get("numero_lote") ?? "").trim() || null,
    manzana: String(formData.get("manzana") ?? "").trim() || null,
    numero_escritura:
      estado === "escriturado"
        ? String(formData.get("numero_escritura") ?? "").trim() || null
        : null,
    fecha_escritura:
      estado === "escriturado"
        ? String(formData.get("fecha_escritura") ?? "").trim() || null
        : null,
    numero_factura:
      estado === "facturado"
        ? String(formData.get("numero_factura") ?? "").trim() || null
        : null,
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
 * Propiedades o la de Lotes dentro de un Proyecto), sin necesidad de entrar
 * a la página de edición completa del lote. No toca ningún otro campo.
 * `redirect_to` permite volver a la página/filtro desde donde se llamó si
 * algo sale mal (por defecto, la lista de Propiedades).
 */
export async function actualizarSuperficiePropiedad(id: string, formData: FormData) {
  const redirectTo = String(formData.get("redirect_to") ?? "").trim() || "/propiedades";
  await requireAdmin(redirectTo);
  const supabase = await createClient();
  const raw = formData.get("superficie_m2");
  const texto = String(raw ?? "").trim();
  const superficie_m2 = texto === "" ? null : Number(texto);

  if (superficie_m2 !== null && (Number.isNaN(superficie_m2) || superficie_m2 < 0)) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent("La superficie debe ser un número válido.")}`
    );
  }

  const { error } = await supabase
    .from("propiedades")
    .update({ superficie_m2 })
    .eq("id", id);

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  revalidatePath("/proyectos", "layout");
}
