"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

function readProyectoForm(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
  };
}

export async function crearProyecto(formData: FormData) {
  const supabase = await createClient();
  const data = readProyectoForm(formData);

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .insert(data)
    .select()
    .single();

  if (error || !proyecto) {
    redirect(`/proyectos/nuevo?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  revalidatePath("/proyectos");
  redirect(`/proyectos/${proyecto.id}`);
}

export async function actualizarProyecto(id: string, formData: FormData) {
  await requireAdmin(`/proyectos/${id}`);
  const supabase = await createClient();
  const data = readProyectoForm(formData);

  const { error } = await supabase.from("proyectos").update(data).eq("id", id);
  if (error) {
    redirect(`/proyectos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/proyectos");
  revalidatePath("/propiedades");
  redirect("/proyectos");
}

export async function eliminarProyecto(id: string) {
  await requireAdmin(`/proyectos/${id}`);
  const supabase = await createClient();

  // Primero se borran los lotes/propiedades que se crearon dentro de este
  // proyecto. Si alguno ya tiene un contrato asociado, la base de datos
  // bloquea ese borrado (no se permite borrar una propiedad con contratos
  // vigentes): en ese caso se cancela todo antes de tocar el proyecto, para
  // no dejarlo a medias (proyecto borrado pero con lotes sueltos, o
  // viceversa).
  const { error: errorPropiedades } = await supabase
    .from("propiedades")
    .delete()
    .eq("proyecto_id", id);

  if (errorPropiedades) {
    redirect(
      `/proyectos/${id}?error=${encodeURIComponent(
        "No se pudo eliminar el proyecto: tiene lotes con contratos asociados. Elimina o reasigna esos contratos antes de borrar el proyecto."
      )}`
    );
  }

  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) {
    redirect(`/proyectos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/proyectos");
  revalidatePath("/propiedades");
  redirect("/proyectos");
}

function pad(valor: number, digitos: number) {
  return String(valor).padStart(digitos, "0");
}

export async function generarLotes(proyectoId: string, formData: FormData) {
  const supabase = await createClient();

  const cantidad = Math.max(1, Math.min(1000, Number(formData.get("cantidad") ?? 0)));
  const desde = Math.max(1, Number(formData.get("desde") ?? 1));
  const manzana = String(formData.get("manzana") ?? "").trim();
  const prefijo = String(formData.get("prefijo") ?? "Lote").trim() || "Lote";
  const superficie = formData.get("superficie_m2")
    ? Number(formData.get("superficie_m2"))
    : null;
  const valorM2 = formData.get("valor_m2") ? Number(formData.get("valor_m2")) : null;

  if (!cantidad) {
    redirect(`/proyectos/${proyectoId}?error=${encodeURIComponent("Indicá una cantidad de lotes válida")}`);
  }

  // La ciudad de los lotes es siempre la del proyecto (ya no se pide en
  // este formulario). El valor por m² se asigna aquí, a nivel de manzana:
  // si además se indica la superficie, el valor total del lote se calcula
  // solo (superficie × valor por m²). Ese valor por m² queda guardado en
  // cada lote para que, si más adelante se corrige el área desde el
  // módulo de Propiedades, el valor total se recalcule automáticamente.
  const { data: proyectoDatos } = await supabase
    .from("proyectos")
    .select("ciudad")
    .eq("id", proyectoId)
    .single();
  const ciudad = proyectoDatos?.ciudad ?? null;

  const valor = superficie && valorM2 ? Math.round(superficie * valorM2 * 100) / 100 : null;

  // Si se indica una manzana, el número de lote queda compuesto: MMLL
  // (ej. manzana 01 + lote 01 = "0101"). El conteo de lotes se reinicia
  // en 1 para cada manzana. Si no se indica manzana, se numera de forma
  // consecutiva como antes.
  const manzanaEsNumerica = manzana !== "" && /^\d+$/.test(manzana);
  const manzanaPad = manzanaEsNumerica ? pad(Number(manzana), 2) : manzana;
  const loteDigitos = String(desde + cantidad - 1).length < 2 ? 2 : String(desde + cantidad - 1).length;

  const lotes = Array.from({ length: cantidad }, (_, i) => {
    const loteNum = desde + i;
    if (manzana) {
      const lotePad = pad(loteNum, loteDigitos);
      return {
        proyecto_id: proyectoId,
        manzana,
        numero_lote: `${manzanaPad}${lotePad}`,
        direccion: `Mz ${manzana} - Lote ${loteNum}`,
        ciudad,
        tipo: "lote",
        estado: "disponible",
        superficie_m2: superficie,
        valor_m2: valorM2,
        valor_referencia: valor,
      };
    }
    const numero = String(loteNum);
    return {
      proyecto_id: proyectoId,
      manzana: null,
      numero_lote: numero,
      direccion: `${prefijo} ${numero}`,
      ciudad,
      tipo: "lote",
      estado: "disponible",
      superficie_m2: superficie,
      valor_m2: valorM2,
      valor_referencia: valor,
    };
  });

  const { error } = await supabase.from("propiedades").insert(lotes);
  if (error) {
    redirect(`/proyectos/${proyectoId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  revalidatePath(`/proyectos/${proyectoId}`);
  redirect(`/proyectos/${proyectoId}`);
}

/**
 * Elimina de una sola vez todos los lotes de una manzana dentro de un
 * proyecto (por ejemplo si se generó con datos equivocados). Si alguno de
 * esos lotes ya tiene un contrato asociado, la base de datos bloquea el
 * borrado de todos (no se permite borrar una propiedad con contratos
 * vigentes) para no dejar la manzana a medias.
 */
export async function eliminarManzana(proyectoId: string, manzana: string) {
  await requireAdmin(`/proyectos/${proyectoId}`);
  const supabase = await createClient();

  const { error } = await supabase
    .from("propiedades")
    .delete()
    .eq("proyecto_id", proyectoId)
    .eq("manzana", manzana);

  if (error) {
    redirect(
      `/proyectos/${proyectoId}?error=${encodeURIComponent(
        "No se pudo eliminar la manzana: alguno de sus lotes tiene un contrato asociado. Elimina o reasigna esos contratos primero."
      )}`
    );
  }

  revalidatePath("/propiedades");
  revalidatePath(`/proyectos/${proyectoId}`);
  redirect(`/proyectos/${proyectoId}`);
}
