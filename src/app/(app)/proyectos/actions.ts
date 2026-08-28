"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  await supabase.from("proyectos").delete().eq("id", id);
  revalidatePath("/proyectos");
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
  const ciudad = String(formData.get("ciudad") ?? "").trim() || null;
  const superficie = formData.get("superficie_m2")
    ? Number(formData.get("superficie_m2"))
    : null;
  const valor = formData.get("valor_referencia")
    ? Number(formData.get("valor_referencia"))
    : null;

  if (!cantidad) {
    redirect(`/proyectos/${proyectoId}?error=${encodeURIComponent("Indicá una cantidad de lotes válida")}`);
  }

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
