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

export async function generarLotes(proyectoId: string, formData: FormData) {
  const supabase = await createClient();

  const cantidad = Math.max(1, Math.min(1000, Number(formData.get("cantidad") ?? 0)));
  const desde = Math.max(1, Number(formData.get("desde") ?? 1));
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

  const lotes = Array.from({ length: cantidad }, (_, i) => {
    const numero = String(desde + i);
    return {
      proyecto_id: proyectoId,
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
