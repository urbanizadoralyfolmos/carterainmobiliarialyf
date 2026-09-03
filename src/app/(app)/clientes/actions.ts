"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ClienteFormData = {
  tipo_persona: "natural" | "juridica";
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  razon_social: string | null;
  nit: string | null;
  representante_nombre: string | null;
  representante_documento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
};

function readClienteForm(formData: FormData): ClienteFormData {
  const tipoPersona = formData.get("tipo_persona") === "juridica" ? "juridica" : "natural";

  if (tipoPersona === "juridica") {
    return {
      tipo_persona: "juridica",
      nombre: null,
      apellido: null,
      documento: null,
      razon_social: String(formData.get("razon_social") ?? "").trim(),
      nit: String(formData.get("nit") ?? "").trim() || null,
      representante_nombre: String(formData.get("representante_nombre") ?? "").trim() || null,
      representante_documento:
        String(formData.get("representante_documento") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      telefono: String(formData.get("telefono") ?? "").trim() || null,
      direccion: String(formData.get("direccion") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
    };
  }

  return {
    tipo_persona: "natural",
    nombre: String(formData.get("nombre") ?? "").trim(),
    apellido: String(formData.get("apellido") ?? "").trim(),
    documento: String(formData.get("documento") ?? "").trim() || null,
    razon_social: null,
    nit: null,
    representante_nombre: null,
    representante_documento: null,
    email: String(formData.get("email") ?? "").trim() || null,
    telefono: String(formData.get("telefono") ?? "").trim() || null,
    direccion: String(formData.get("direccion") ?? "").trim() || null,
    notas: String(formData.get("notas") ?? "").trim() || null,
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
