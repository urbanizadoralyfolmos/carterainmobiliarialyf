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
    moneda: String(formData.get("moneda") ?? "COP"),
    monto_total: formData.get("monto_total") ? Number(formData.get("monto_total")) : null,
    cuota_inicial: Number(formData.get("cuota_inicial") ?? 0),
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

  const cuotas: {
    contrato_id: string;
    numero_cuota: number;
    fecha_vencimiento: string;
    monto: number;
    monto_pagado: number;
    estado: string;
  }[] = [];

  // Cuota inicial (número 0), vence en la fecha de inicio del contrato.
  if (data.cuota_inicial > 0) {
    cuotas.push({
      contrato_id: contrato.id,
      numero_cuota: 0,
      fecha_vencimiento: data.fecha_inicio,
      monto: data.cuota_inicial,
      monto_pagado: 0,
      estado: "pendiente",
    });
  }

  // Cuotas diferidas: cada una con el monto que se cargó en el formulario.
  const offsetMeses = data.cuota_inicial > 0 ? 1 : 0;
  const fechas = generarFechasCuotas(
    data.fecha_inicio,
    data.cantidad_cuotas,
    data.dia_vencimiento,
    offsetMeses
  );

  fechas.forEach((fecha, i) => {
    const monto = Number(formData.get(`monto_cuota_${i + 1}`) ?? 0);
    cuotas.push({
      contrato_id: contrato.id,
      numero_cuota: i + 1,
      fecha_vencimiento: fecha,
      monto,
      monto_pagado: 0,
      estado: "pendiente",
    });
  });

  const { error: errorCuotas } = await supabase.from("cuotas").insert(cuotas);
  if (errorCuotas) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(errorCuotas.message)}`);
  }

  // La propiedad pasa a "prometido en venta" al quedar ligada a un contrato
  // (solo si todavía estaba disponible; no se pisa un estado más avanzado).
  await supabase
    .from("propiedades")
    .update({ estado: "prometido_en_venta" })
    .eq("id", data.propiedad_id)
    .eq("estado", "disponible");

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
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
