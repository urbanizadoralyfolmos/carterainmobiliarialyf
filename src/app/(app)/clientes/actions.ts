"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarTelefonoCO } from "@/lib/utils/telefono";

function readClienteForm(formData: FormData) {
  const tipoPersona = String(formData.get("tipo_persona") ?? "natural") === "juridica"
    ? "juridica"
    : "natural";

  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    apellido: String(formData.get("apellido") ?? "").trim(),
    documento: String(formData.get("documento") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    telefono: normalizarTelefonoCO(String(formData.get("telefono") ?? "")),
    direccion: String(formData.get("direccion") ?? "").trim() || null,
    notas: String(formData.get("notas") ?? "").trim() || null,
    tipo_persona: tipoPersona,
    razon_social:
      tipoPersona === "juridica"
        ? String(formData.get("razon_social") ?? "").trim() || null
        : null,
    nit: tipoPersona === "juridica" ? String(formData.get("nit") ?? "").trim() || null : null,
    representante_nombre:
      tipoPersona === "juridica" ? String(formData.get("nombre") ?? "").trim() || null : null,
    representante_documento:
      tipoPersona === "juridica"
        ? String(formData.get("representante_documento") ?? "").trim() || null
        : null,
  };
}

export async function crearCliente(formData: FormData) {
  const supabase = await createClient();
  const data = readClienteForm(formData);

  const { error } = await supabase.from("clientes").insert(data);
  if (error) {
    redirect(`/clientes/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function actualizarCliente(id: string, formData: FormData) {
  const supabase = await createClient();
  const data = readClienteForm(formData);

  const { error } = await supabase.from("clientes").update(data).eq("id", id);
  if (error) {
    redirect(`/clientes/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient();
  await supabase.from("clientes").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}
