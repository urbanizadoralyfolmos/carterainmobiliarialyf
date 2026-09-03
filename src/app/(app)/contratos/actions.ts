"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generarFechasCuotas } from "@/lib/utils/mora";

function readContratoForm(formData: FormData) {
  return {
    cliente_id: String(formData.get("cliente_id") ?? ""),
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

function readPropiedadIds(formData: FormData) {
  return Array.from(new Set(formData.getAll("propiedad_ids").map(String).filter(Boolean)));
}

export async function crearContrato(formData: FormData) {
  const supabase = await createClient();
  const data = readContratoForm(formData);
  const propiedadIds = readPropiedadIds(formData);

  if (propiedadIds.length === 0) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent("Seleccioná al menos una propiedad para el contrato")}`);
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert(data)
    .select()
    .single();

  if (error || !contrato) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  const { error: errorVinculos } = await supabase
    .from("contrato_propiedades")
    .insert(propiedadIds.map((propiedad_id) => ({ contrato_id: contrato.id, propiedad_id })));
  if (errorVinculos) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(errorVinculos.message)}`);
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

  // Las propiedades pasan a "prometido en venta" al quedar ligadas a un
  // contrato (solo las que todavía estaban disponibles; no se pisa un
  // estado más avanzado).
  await supabase
    .from("propiedades")
    .update({ estado: "prometido_en_venta" })
    .in("id", propiedadIds)
    .eq("estado", "disponible");

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
  redirect("/contratos");
}

export async function actualizarContrato(id: string, formData: FormData) {
  const supabase = await createClient();
  const data = readContratoForm(formData);
  const propiedadIds = readPropiedadIds(formData);

  if (propiedadIds.length === 0) {
    redirect(`/contratos/${id}?error=${encodeURIComponent("Seleccioná al menos una propiedad para el contrato")}`);
  }

  // No se regenera el plan de cuotas al editar: solo se actualizan los
  // datos del contrato. El plan de cuotas se gestiona desde /cuotas.
  const { error } = await supabase.from("contratos").update(data).eq("id", id);
  if (error) {
    redirect(`/contratos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  // Comparamos contra el vínculo actual para saber qué propiedades se
  // agregan y cuáles se sacan del contrato.
  const { data: actuales } = await supabase
    .from("contrato_propiedades")
    .select("propiedad_id")
    .eq("contrato_id", id);
  const idsActuales = new Set((actuales ?? []).map((v) => v.propiedad_id as string));
  const idsNuevos = new Set(propiedadIds);

  const aQuitar = [...idsActuales].filter((pid) => !idsNuevos.has(pid));
  const aAgregar = [...idsNuevos].filter((pid) => !idsActuales.has(pid));

  if (aQuitar.length > 0) {
    await supabase
      .from("contrato_propiedades")
      .delete()
      .eq("contrato_id", id)
      .in("propiedad_id", aQuitar);

    // Las propiedades que se desvinculan y seguían "prometido en venta"
    // vuelven a quedar disponibles.
    await supabase
      .from("propiedades")
      .update({ estado: "disponible" })
      .in("id", aQuitar)
      .eq("estado", "prometido_en_venta");
  }

  if (aAgregar.length > 0) {
    const { error: errorAgregar } = await supabase
      .from("contrato_propiedades")
      .insert(aAgregar.map((propiedad_id) => ({ contrato_id: id, propiedad_id })));
    if (errorAgregar) {
      redirect(`/contratos/${id}?error=${encodeURIComponent(errorAgregar.message)}`);
    }

    await supabase
      .from("propiedades")
      .update({ estado: "prometido_en_venta" })
      .in("id", aAgregar)
      .eq("estado", "disponible");
  }

  revalidatePath("/contratos");
  revalidatePath("/propiedades");
  redirect("/contratos");
}

export async function eliminarContrato(id: string) {
  const supabase = await createClient();
  await supabase.from("contratos").delete().eq("id", id);
  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
  redirect("/contratos");
}
