"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readProyectoForm(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    valor_m2: formData.get("valor_m2") ? Number(formData.get("valor_m2")) : null,
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
  let valor = formData.get("valor_referencia")
    ? Number(formData.get("valor_referencia"))
    : null;

  if (!cantidad) {
    redirect(`/proyectos/${proyectoId}?error=${encodeURIComponent("Indicá una cantidad de lotes válida")}`);
  }

  // Si no se indicó un valor manual, se calcula solo con el valor por m²
  // configurado en el proyecto (valor = área × valor por m²).
  if (valor === null && superficie) {
    const { data: proyectoValor } = await supabase
      .from("proyectos")
      .select("valor_m2")
      .eq("id", proyectoId)
      .single();
    if (proyectoValor?.valor_m2) {
      valor = Math.round(superficie * proyectoValor.valor_m2 * 100) / 100;
    }
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
  // En vez de volver directo al proyecto, pasamos por la pantalla de
  // "completar áreas" para poder cargar el m² de cada lote recién creado
  // de forma rápida, uno debajo del otro.
  redirect(`/proyectos/${proyectoId}/completar-area?cantidad=${cantidad}`);
}

export async function guardarAreasLotes(proyectoId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("valor_m2")
    .eq("id", proyectoId)
    .single();
  const valorM2 = proyecto?.valor_m2 ?? null;

  const actualizaciones: { id: string; superficie_m2: number; valor_referencia: number | null }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("sup_")) continue;
    const id = key.slice(4);
    const texto = String(value).trim();
    if (!texto) continue;
    const superficie = Number(texto);
    if (!superficie || superficie <= 0) continue;

    // Si el lote trae un valor manual propio (val_<id>), se respeta. Si no,
    // se recalcula solo: área × valor por m² del proyecto.
    const valorManualTexto = String(formData.get(`val_${id}`) ?? "").trim();
    let valor: number | null = null;
    if (valorManualTexto) {
      valor = Number(valorManualTexto);
    } else if (valorM2) {
      valor = Math.round(superficie * valorM2 * 100) / 100;
    }

    actualizaciones.push({ id, superficie_m2: superficie, valor_referencia: valor });
  }

  if (actualizaciones.length === 0) {
    redirect(`/proyectos/${proyectoId}`);
  }

  const resultados = await Promise.all(
    actualizaciones.map(({ id, superficie_m2, valor_referencia }) =>
      supabase.from("propiedades").update({ superficie_m2, valor_referencia }).eq("id", id)
    )
  );
  const conError = resultados.find((r) => r.error);
  if (conError?.error) {
    redirect(`/proyectos/${proyectoId}?error=${encodeURIComponent(conError.error.message)}`);
  }

  revalidatePath("/propiedades");
  revalidatePath(`/proyectos/${proyectoId}`);
  redirect(`/proyectos/${proyectoId}`);
}
