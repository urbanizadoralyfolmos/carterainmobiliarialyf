"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readPropiedadForm(formData: FormData) {
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
    estado: String(formData.get("estado") ?? "disponible"),
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
  const supabase = await createClient();
  const data = readPropiedadForm(formData);

  const { error } = await supabase.from("propiedades").update(data).eq("id", id);
  if (error) {
    redirect(`/propiedades/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/propiedades");
  redirect("/propiedades");
}

export async function eliminarPropiedad(id: string) {
  const supabase = await createClient();
  await supabase.from("propiedades").delete().eq("id", id);
  revalidatePath("/propiedades");
  redirect("/propiedades");
}
