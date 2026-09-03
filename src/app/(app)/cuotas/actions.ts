"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registrarPago(id: string, formData: FormData) {
  const supabase = await createClient();

  const montoPagado = Number(formData.get("monto_pagado") ?? 0);
  const montoCuota = Number(formData.get("monto_cuota") ?? 0);

  const { data: cuotaActual } = await supabase
    .from("cuotas")
    .select("monto_pagado")
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
    })
    .eq("id", id);

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");

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
  const supabase = await createClient();

  await supabase
    .from("cuotas")
    .update({ monto_pagado: 0, estado: "pendiente", fecha_pago: null })
    .eq("id", id);

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
}
