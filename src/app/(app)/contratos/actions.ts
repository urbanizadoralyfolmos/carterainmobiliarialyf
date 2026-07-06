"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generarFechasCuotas } from "@/lib/utils/mora";

function readContratoForm(formData: FormData) {
  return {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    propiedad_id: String(formData.get("propiedad_id") ?? ""),
    tipo: String(formData.get("tipo") ?? "alquiler"),
    fecha_inicio: String(formData.get("fecha_inicio") ?? ""),
    fecha_fin: String(formData.get("fecha_fin") ?? "") || null,
    monto_cuota: Number(formData.get("monto_cuota") ?? 0),
    moneda: String(formData.get("moneda") ?? "ARS"),
    cantidad_cuotas: Number(formData.get("cantidad_cuotas") ?? 12),
    dia_vencimiento: Number(formData.get("dia_vencimiento") ?? 10),
    tasa_mora_mensual: Number(formData.get("tasa_mora_mensual") ?? 5),
    estado: String(formData.get("estado") ?? "activo"),
    notas: String(formData.get("notas") ?? "").trim() || null,
  };
}

export async function crearContrato(formData: FormData) {
  const supabase = await createClient();
  const data = readContratoForm(formData);

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert(data)
    .select()
    .single();

  if (error || !contrato) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  // Genera automáticamente el plan de cuotas del contrato
  const fechas = generarFechasCuotas(
    data.fecha_inicio,
    data.cantidad_cuotas,
    data.dia_vencimiento
  );

  const cuotas = fechas.map((fecha, i) => ({
    contrato_id: contrato.id,
    numero_cuota: i + 1,
    fecha_vencimiento: fecha,
    monto: data.monto_cuota,
    monto_pagado: 0,
    estado: "pendiente",
  }));

  const { error: errorCuotas } = await supabase.from("cuotas").insert(cuotas);
  if (errorCuotas) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(errorCuotas.message)}`);
  }

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  redirect("/contratos");
}

export async function actualizarContrato(id: string, formData: FormData) {
  const supabase = await createClient();
  const data = readContratoForm(formData);

  // No se regenera el plan de cuotas al editar: solo se actualizan los
  // datos del contrato. El plan de cuotas se gestiona desde /cuotas.
  const { error } = await supabase.from("contratos").update(data).eq("id", id);
  if (error) {
    redirect(`/contratos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function eliminarContrato(id: string) {
  const supabase = await createClient();
  await supabase.from("contratos").delete().eq("id", id);
  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  redirect("/contratos");
}
