"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/rol";

/**
 * Registra o corrige el número/fecha de factura de un contrato.
 *
 * Si el contrato todavía no estaba en estado "facturado", este guardado lo
 * pasa a ese estado (se crea así la factura). Si ya estaba facturado, solo
 * corrige el número/fecha sin volver a disparar nada.
 *
 * El cambio de estado del contrato dispara los triggers de la base de datos
 * que recalculan automáticamente el estado de las propiedades vinculadas
 * (quedan también "facturado"); no hace falta tocarlas manualmente aquí.
 */
export async function guardarFactura(formData: FormData) {
  await requireAdmin("/facturas");
  const supabase = await createClient();

  const contratoId = String(formData.get("contrato_id") ?? "");
  const numeroFactura = String(formData.get("numero_factura") ?? "").trim();
  const fechaFactura = String(formData.get("fecha_factura") ?? "").trim() || null;

  if (!contratoId) {
    redirect(`/facturas?error=${encodeURIComponent("Falta el contrato a facturar.")}`);
  }

  if (!numeroFactura) {
    redirect(`/facturas?error=${encodeURIComponent("Ingresa el número de factura.")}`);
  }

  const { data: contrato } = await supabase
    .from("contratos")
    .select("estado")
    .eq("id", contratoId)
    .single();

  if (!contrato) {
    redirect(`/facturas?error=${encodeURIComponent("El contrato no existe.")}`);
  }

  if (contrato.estado === "anulado") {
    redirect(
      `/facturas?error=${encodeURIComponent("Un contrato anulado no se puede facturar.")}`
    );
  }

  const update: Record<string, string | null> = {
    numero_factura: numeroFactura,
    fecha_factura: fechaFactura,
  };
  if (contrato.estado !== "facturado") {
    update.estado = "facturado";
  }

  const { error } = await supabase.from("contratos").update(update).eq("id", contratoId);

  if (error) {
    redirect(`/facturas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/facturas");
  revalidatePath("/contratos");
  revalidatePath("/propiedades");
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  redirect("/facturas?ok=1");
}
