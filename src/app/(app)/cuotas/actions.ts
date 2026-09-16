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

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("monto_pagado, contrato_id")
    .eq("id", id)
    .single();

  const montoPagadoAnterior = cuotaActual?.monto_pagado ?? 0;
  const montoDelPago = Math.max(0, montoPagado - montoPagadoAnterior);
  const fechaPago = new Date().toISOString().slice(0, 10);
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
      .insert({ cuota_id: id, monto: montoDelPago, fecha_pago: fechaPago })
      .select("id")
      .single();

    if (recibo) {
      redirect(`/recibos/${recibo.id}`);
    }
  }

  redirect("/cuotas");
}

export async function revertirPago(id: string) {
  await requireAdmin("/cuotas");
  const supabase = await createClient();

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("contrato_id")
    .eq("id", id)
    .single();

  await supabase
    .from("cuotas")
    .update({ monto_pagado: 0, estado: "pendiente", fecha_pago: null, referencia: null })
    .eq("id", id);

  // Si el contrato estaba "paz y salvo sin escritura" (todas pagadas), al
  // revertir este pago ya no lo está: vuelve a "activo" automáticamente.
  if (cuotaActual?.contrato_id) {
    await supabase.rpc("sincronizar_estado_contrato_por_pagos", {
      p_contrato_id: cuotaActual.contrato_id,
    });
  }

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
  revalidatePath("/contratos");
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
