"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

type SupabaseClienteServidor = Awaited<ReturnType<typeof createClient>>;

/**
 * Recalcula monto_pagado/estado/fecha_pago de una cuota desde cero, sumando
 * únicamente el desglose que le corresponde dentro de los recibos activos
 * (no anulados) que la cubren. Un recibo puede cubrir varias cuotas (cuando
 * un abono superó el valor de una cuota y el excedente se aplicó a las
 * siguientes), así que no alcanza con sumar recibos.monto: hay que mirar su
 * detalle_cuotas y tomar solo la parte que le tocó a esta cuota puntual.
 */
async function recalcularCuotaDesdeRecibos(
  supabase: SupabaseClienteServidor,
  cuotaId: string,
  montoCuota: number
) {
  const { data: recibosActivos } = await supabase
    .from("recibos")
    .select("detalle_cuotas, fecha_pago")
    .contains("cuota_ids", [cuotaId])
    .eq("anulado", false)
    .order("fecha_pago", { ascending: false });

  let montoPagado = 0;
  let fechaPago: string | null = null;

  for (const recibo of recibosActivos ?? []) {
    const detalle = (recibo.detalle_cuotas ?? []) as { cuota_id: string; monto: number }[];
    const item = detalle.find((d) => d.cuota_id === cuotaId);
    if (item) {
      montoPagado += Number(item.monto);
      if (!fechaPago) fechaPago = recibo.fecha_pago;
    }
  }

  const nuevoEstado =
    montoPagado <= 0 ? "pendiente" : montoPagado >= montoCuota ? "pagada" : "parcial";

  const update: {
    monto_pagado: number;
    estado: string;
    fecha_pago: string | null;
    referencia?: null;
  } = { monto_pagado: montoPagado, estado: nuevoEstado, fecha_pago: fechaPago };
  if (montoPagado <= 0) {
    update.referencia = null;
  }

  await supabase.from("cuotas").update(update).eq("id", cuotaId);
}

/**
 * Registra un pago sobre una cuota. Si lo pagado alcanza o supera el valor
 * de esa cuota, el excedente se va aplicando automáticamente a las cuotas
 * siguientes del mismo contrato (en orden, saltando las que ya estén
 * pagadas) hasta agotar el excedente. Se genera UN SOLO recibo por el valor
 * total pagado, con un detalle de cuánto se aplicó a cada cuota cubierta.
 * Si el excedente alcanza a cubrir TODAS las cuotas pendientes del
 * contrato, lo que sobre se deja acreditado en la última cuota disponible,
 * para no perder registro del dinero recibido.
 */
export async function registrarPago(id: string, formData: FormData) {
  const supabase = await createClient();

  const montoPagado = Number(formData.get("monto_pagado") ?? 0);
  const montoCuota = Number(formData.get("monto_cuota") ?? 0);
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const fechaPago =
    String(formData.get("fecha_pago") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("monto_pagado, contrato_id, numero_cuota")
    .eq("id", id)
    .single();

  const montoPagadoAnterior = cuotaActual?.monto_pagado ?? 0;
  const montoDelPago = Math.max(0, montoPagado - montoPagadoAnterior);

  let reciboId: string | null = null;

  if (montoDelPago > 0 && cuotaActual) {
    // Cuotas siguientes del mismo contrato que todavía deben plata, en
    // orden, para repartir ahí el excedente si sobra después de esta.
    const { data: siguientes } = await supabase
      .from("cuotas")
      .select("id, numero_cuota, monto, monto_pagado")
      .eq("contrato_id", cuotaActual.contrato_id)
      .neq("id", id)
      .gt("numero_cuota", cuotaActual.numero_cuota)
      .in("estado", ["pendiente", "parcial"])
      .order("numero_cuota", { ascending: true });

    const cola = [
      {
        id,
        numeroCuota: cuotaActual.numero_cuota,
        montoCuota,
        montoPagadoPrevio: montoPagadoAnterior,
      },
      ...(siguientes ?? []).map((c) => ({
        id: c.id as string,
        numeroCuota: c.numero_cuota,
        montoCuota: Number(c.monto),
        montoPagadoPrevio: Number(c.monto_pagado ?? 0),
      })),
    ];

    let restante = montoDelPago;
    const detalleCuotas: { cuota_id: string; numero_cuota: number; monto: number }[] = [];

    for (let i = 0; i < cola.length; i++) {
      if (restante <= 0) break;

      const esUltima = i === cola.length - 1;
      const { id: cuotaId, numeroCuota, montoCuota: montoDeEstaCuota, montoPagadoPrevio } = cola[i];
      const necesario = Math.max(0, montoDeEstaCuota - montoPagadoPrevio);
      // En la última cuota disponible se aplica todo lo que quede, aunque
      // supere su valor, para no perder parte del abono recibido.
      const aplicado = esUltima ? restante : Math.min(restante, necesario);
      if (aplicado <= 0) continue;

      const nuevoMontoPagado = montoPagadoPrevio + aplicado;
      const nuevoEstado = nuevoMontoPagado >= montoDeEstaCuota ? "pagada" : "parcial";

      await supabase
        .from("cuotas")
        .update({
          monto_pagado: nuevoMontoPagado,
          estado: nuevoEstado,
          fecha_pago: fechaPago,
        })
        .eq("id", cuotaId);

      detalleCuotas.push({ cuota_id: cuotaId, numero_cuota: numeroCuota, monto: aplicado });
      restante -= aplicado;
    }

    if (detalleCuotas.length > 0) {
      const { data: recibo } = await supabase
        .from("recibos")
        .insert({
          cuota_id: id,
          monto: montoDelPago,
          fecha_pago: fechaPago,
          notas,
          cuota_ids: detalleCuotas.map((d) => d.cuota_id),
          detalle_cuotas: detalleCuotas,
        })
        .select("id")
        .single();

      reciboId = recibo?.id ?? null;
    }
  }

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

  if (reciboId) {
    redirect(`/recibos/${reciboId}`);
  }

  redirect("/cuotas");
}

/**
 * Reversa el ÚLTIMO recibo activo (no anulado) que cubre esta cuota — por
 * ejemplo si se aplicó por error a la cuota o al contrato equivocado. En vez
 * de borrar el recibo, lo marca como anulado (con motivo, fecha y quién lo
 * hizo) para dejar rastro de que hubo un pago mal aplicado y se corrigió.
 *
 * Como un recibo puede cubrir varias cuotas (cuando un abono se repartió
 * por excedente), reversarlo deshace el pago de TODAS las cuotas que ese
 * recibo cubrió, no solo la que se clickeó — es un solo pago, se reversa
 * entero. El monto pagado y el estado de cada cuota afectada se recalculan
 * siempre desde cero, sumando únicamente los recibos que sigan activos.
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
    .select("id, cuota_ids")
    .contains("cuota_ids", [id])
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
    .eq("id", reciboActivo!.id);

  // Recalcular TODAS las cuotas que cubría ese recibo (no solo "id"): si el
  // abono se había repartido entre varias, reversar el recibo las afecta a
  // todas por igual.
  const cuotaIdsAfectadas: string[] =
    reciboActivo!.cuota_ids && reciboActivo!.cuota_ids.length > 0 ? reciboActivo!.cuota_ids : [id];

  const { data: cuotasAfectadas } = await supabase
    .from("cuotas")
    .select("id, monto, contrato_id")
    .in("id", cuotaIdsAfectadas);

  for (const c of cuotasAfectadas ?? []) {
    await recalcularCuotaDesdeRecibos(supabase, c.id, Number(c.monto));
  }

  // Si el contrato estaba "paz y salvo sin escritura" (todas pagadas), al
  // reversar este pago puede que ya no lo esté: se vuelve a sincronizar.
  const contratoId = cuotaActual?.contrato_id ?? cuotasAfectadas?.[0]?.contrato_id;
  if (contratoId) {
    await supabase.rpc("sincronizar_estado_contrato_por_pagos", { p_contrato_id: contratoId });
  }

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath("/recibos");
  revalidatePath(`/recibos/${reciboActivo!.id}`);
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
