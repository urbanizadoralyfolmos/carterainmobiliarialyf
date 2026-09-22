"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

export async function registrarPago(id: string, formData: FormData) {
  const supabase = await createClient();

  const montoPagado = Number(formData.get("monto_pagado") ?? 0);
  const montoCuota = Number(formData.get("monto_cuota") ?? 0);
  const referencia = String(formData.get("referencia") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const fechaPago =
    String(formData.get("fecha_pago") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("monto_pagado, contrato_id")
    .eq("id", id)
    .single();

  const montoPagadoAnterior = cuotaActual?.monto_pagado ?? 0;
  const montoDelPago = Math.max(0, montoPagado - montoPagadoAnterior);
  const estado = montoPagado >= montoCuota ? "pagada" : "parcial";

  await supabase
    .from("cuotas")
    .update({
      monto_pagado: montoPagado,
      estado,
      fecha_pago: fechaPago,
      referencia,
    })
    .eq("id", id);

  // Si con este pago quedaron todas las cuotas del contrato pagadas, lo pasa
  // solo a "paz y salvo sin escritura" (sin tocar escriturado/anulado).
  if (cuotaActual?.contrato_id) {
    await supabase.rpc("sincronizar_estado_contrato_por_pagos", {
      p_contrato_id: cuotaActual.contrato_id,
    });
  }

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
  revalidatePath("/contratos");

  if (montoDelPago > 0) {
    const { data: recibo } = await supabase
      .from("recibos")
      .insert({ cuota_id: id, monto: montoDelPago, fecha_pago: fechaPago, notas })
      .select("id")
      .single();

    if (recibo) {
      redirect(`/recibos/${recibo.id}`);
    }
  }

  redirect("/cuotas");
}

/**
 * Reversa el ÚLTIMO pago activo (no anulado) de una cuota — por ejemplo si
 * se aplicó por error a la cuota o al contrato equivocado. En vez de borrar
 * el recibo, lo marca como anulado (con motivo, fecha y quién lo hizo) para
 * dejar rastro de que hubo un pago mal aplicado y se corrigió. El monto
 * pagado y el estado de la cuota se recalculan siempre desde cero, sumando
 * únicamente los recibos que sigan activos — así queda correcto aunque la
 * cuota tenga más de un pago parcial.
 */
export async function revertirPago(id: string, formData: FormData) {
  await requireAdmin("/cuotas");
  const supabase = await createClient();

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) {
    redirect(`/cuotas?error=${encodeURIComponent("Tenés que indicar un motivo para reversar el pago.")}`);
  }

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("contrato_id, monto")
    .eq("id", id)
    .single();

  const { data: reciboActivo } = await supabase
    .from("recibos")
    .select("id")
    .eq("cuota_id", id)
    .eq("anulado", false)
    .order("fecha_pago", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reciboActivo) {
    redirect(
      `/cuotas?error=${encodeURIComponent("Esta cuota no tiene ningún pago activo para reversar.")}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("recibos")
    .update({
      anulado: true,
      anulado_motivo: motivo,
      anulado_at: new Date().toISOString(),
      anulado_por: user?.id ?? null,
    })
    .eq("id", reciboActivo.id);

  const { data: recibosActivos } = await supabase
    .from("recibos")
    .select("monto, fecha_pago")
    .eq("cuota_id", id)
    .eq("anulado", false)
    .order("fecha_pago", { ascending: false });

  const montoPagado = (recibosActivos ?? []).reduce((suma, r) => suma + Number(r.monto), 0);
  const montoCuota = cuotaActual?.monto ?? 0;
  const nuevoEstado =
    montoPagado <= 0 ? "pendiente" : montoPagado >= montoCuota ? "pagada" : "parcial";
  const fechaPago = recibosActivos?.[0]?.fecha_pago ?? null;

  const cuotaUpdate: {
    monto_pagado: number;
    estado: string;
    fecha_pago: string | null;
    referencia?: null;
  } = {
    monto_pagado: montoPagado,
    estado: nuevoEstado,
    fecha_pago: fechaPago,
  };
  if (montoPagado <= 0) {
    cuotaUpdate.referencia = null;
  }

  await supabase.from("cuotas").update(cuotaUpdate).eq("id", id);

  // Si el contrato estaba "paz y salvo sin escritura" (todas pagadas), al
  // reversar este pago puede que ya no lo esté: se vuelve a sincronizar.
  if (cuotaActual?.contrato_id) {
    await supabase.rpc("sincronizar_estado_contrato_por_pagos", {
      p_contrato_id: cuotaActual.contrato_id,
    });
  }

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath("/recibos");
  revalidatePath(`/recibos/${reciboActivo.id}`);
  redirect("/cuotas");
}

/**
 * Corrige la fecha de vencimiento y/o el monto de una cuota ya cargada
 * (por ejemplo, si se generó con un dato equivocado). No toca lo ya pagado
 * ni el estado; eso se maneja desde "Pagar"/"Revertir".
 */
export async function actualizarCuota(id: string, contratoId: string, formData: FormData) {
  await requireAdmin(`/cuotas/${id}/editar`);
  const supabase = await createClient();

  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "");
  const monto = Number(formData.get("monto") ?? 0);

  if (!fechaVencimiento || !(monto >= 0)) {
    redirect(
      `/cuotas/${id}/editar?error=${encodeURIComponent(
        "Completa una fecha de vencimiento y un monto válidos."
      )}`
    );
  }

  const { error } = await supabase
    .from("cuotas")
    .update({ fecha_vencimiento: fechaVencimiento, monto })
    .eq("id", id);

  if (error) {
    redirect(`/cuotas/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/cuotas");
  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  revalidatePath("/dashboard");
  redirect(`/contratos/${contratoId}/estado-cuenta`);
}

/**
 * Agrega una cuota faltante a un contrato que ya existe (por ejemplo, cuando
 * el plan se cargó incompleto). El número de cuota se calcula solo
 * (siguiente disponible) para no arriesgar números duplicados.
 */
export async function agregarCuota(contratoId: string, formData: FormData) {
  const supabase = await createClient();

  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "");
  const monto = Number(formData.get("monto") ?? 0);

  if (!fechaVencimiento || !(monto > 0)) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Completa una fecha de vencimiento y un monto válidos para la nueva cuota."
      )}`
    );
  }

  const { data: ultimaCuota } = await supabase
    .from("cuotas")
    .select("numero_cuota")
    .eq("contrato_id", contratoId)
    .order("numero_cuota", { ascending: false })
    .limit(1)
    .maybeSingle();

  const siguienteNumero = (ultimaCuota?.numero_cuota ?? -1) + 1;

  const { error } = await supabase.from("cuotas").insert({
    contrato_id: contratoId,
    numero_cuota: siguienteNumero,
    fecha_vencimiento: fechaVencimiento,
    monto,
    monto_pagado: 0,
    estado: "pendiente",
  });

  if (error) {
    redirect(`/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(error.message)}`);
  }

  // Agregar una cuota pendiente puede sacar al contrato de "paz y salvo sin
  // escritura" (ya no están todas pagadas).
  await supabase.rpc("sincronizar_estado_contrato_por_pagos", { p_contrato_id: contratoId });

  revalidatePath("/cuotas");
  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  revalidatePath("/contratos");
  revalidatePath("/dashboard");
  redirect(`/contratos/${contratoId}/estado-cuenta`);
}

/** Elimina una cuota (por ejemplo, una que se cargó de más por error). */
export async function eliminarCuota(id: string, contratoId: string) {
  await requireAdmin(`/contratos/${contratoId}/estado-cuenta`);
  const supabase = await createClient();

  await supabase.from("cuotas").delete().eq("id", id);

  // Eliminar una cuota pendiente puede dejar todas las restantes pagadas.
  await supabase.rpc("sincronizar_estado_contrato_por_pagos", { p_contrato_id: contratoId });

  revalidatePath("/cuotas");
  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  revalidatePath("/contratos");
  revalidatePath("/dashboard");
  redirect(`/contratos/${contratoId}/estado-cuenta`);
}
