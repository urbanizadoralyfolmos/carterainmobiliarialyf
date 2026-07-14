"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registrarPago(id: string, formData: FormData) {
  const supabase = await createClient();

  const montoPagado = Number(formData.get("monto_pagado") ?? 0);
  const montoCuota = Number(formData.get("monto_cuota") ?? 0);

  const estado = montoPagado >= montoCuota ? "pagada" : "parcial";

  await supabase
    .from("cuotas")
    .update({
      monto_pagado: montoPagado,
      estado,
      fecha_pago: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);

  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
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
